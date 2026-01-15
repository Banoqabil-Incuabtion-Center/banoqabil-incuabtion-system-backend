const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const User = require("../models/user.model");
const { getIO } = require("../socket");

exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const currentUserId = req.user.id;

        if (!query) {
            return res.status(200).json([]);
        }

        const users = await User.find({
            $and: [
                { _id: { $ne: currentUserId } },
                {
                    $or: [
                        { name: { $regex: query, $options: "i" } },
                        { email: { $regex: query, $options: "i" } }
                    ]
                }
            ]
        }).select("name email avatar _id status");

        res.status(200).json(users);
    } catch (error) {
        console.error("Error in searchUsers:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const { sendPushNotification } = require("./push.controller");

exports.sendMessage = async (req, res) => {
    try {
        const { message, receiverId, iv, isEncrypted } = req.body;
        const senderId = req.user.id;

        // Fetch sender details early (needed for publicKey and push notification)
        const sender = await User.findById(senderId).select("name avatar publicKey");

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] },
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
            });
        }

        const newMessage = new Message({
            conversationId: conversation._id,
            sender: senderId,
            text: message,
            iv: iv || null,
            isEncrypted: isEncrypted || false,
            senderPublicKey: sender?.publicKey || null, // Store sender's key
        });

        await newMessage.save();

        conversation.lastMessage = newMessage._id;
        await conversation.save();

        // Socket.IO logic
        try {
            const io = getIO();
            io.to(receiverId).emit("newMessage", newMessage);
            io.to(senderId).emit("newMessage", newMessage); // Sync sender's other devices

            // Send Push Notification
            console.log("Preparing push notification for message from:", sender?.name);

            // For encrypted messages, show generic text since server can't decrypt
            const notificationBody = isEncrypted
                ? "Sent you a message"
                : (message.length > 50 ? message.substring(0, 50) + "..." : message);

            const pushPayload = {
                title: sender ? sender.name : 'New Message',
                body: notificationBody,
                icon: sender?.avatar,
                tag: 'message',
                data: {
                    url: `/direct?user=${senderId}`, // Deep link to specific chat
                    type: 'message'
                }
            };

            // Send asynchronously, don't await block the response
            sendPushNotification(receiverId, pushPayload).catch(err => console.error("Push Err:", err));

        } catch (socketError) {
            console.error("Socket emit error:", socketError);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error in sendMessage:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const senderId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const conversations = await Conversation.find({
            participants: senderId,
        })
            .populate("participants", "name avatar email") // Populate participant details
            .populate("lastMessage")
            .sort({ updatedAt: -1 }) // Latest conversations first
            .skip(skip)
            .limit(limit);

        res.status(200).json(conversations);
    } catch (error) {
        console.error("Error in getConversations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { id: receiverId } = req.params;
        const senderId = req.user.id;
        const { limit = 15, before } = req.query;

        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] },
        });

        if (!conversation) {
            return res.status(200).json([]);
        }

        const query = { conversationId: conversation._id };

        // If 'before' timestamp is provided, fetch messages older than that
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .populate("sender", "name avatar email")
            .sort({ createdAt: -1 }) // Get newest first (simplifies pagination logic)
            .limit(parseInt(limit));

        // Reverse to return in chronological order (oldest -> newest) for the frontend
        res.status(200).json(messages.reverse());
    } catch (error) {
        console.error("Error in getMessages:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.body;
        const readerId = req.user.id;

        await Message.updateMany(
            { conversationId, seenBy: { $ne: readerId } },
            { $addToSet: { seenBy: readerId } }
        );

        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        console.error("Error in markAsRead:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all conversations the user is part of
        const conversations = await Conversation.find({ participants: userId })
            .populate("lastMessage");

        // Count conversations where last message is unread and NOT from current user
        const unreadCount = conversations.filter(conv => {
            const lastMessage = conv.lastMessage;
            if (!lastMessage) return false;

            const senderId = lastMessage.sender.toString();
            const isFromOther = senderId !== userId;
            const isUnread = !lastMessage.seenBy.includes(userId);

            return isFromOther && isUnread;
        }).length;

        res.status(200).json({ unreadCount });
    } catch (error) {
        console.error("Error in getUnreadCount:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// E2E Encryption: Get user's public key (and your own backup)
exports.getUserPublicKey = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        // If asking for own ID, also return backup info
        const isOwn = userId.toString() === currentUserId.toString();

        console.log('🔐 E2E Debug: Fetching public key for', { userId, currentUserId, isOwn });

        const selectFields = isOwn
            ? 'publicKey encryptedPrivateKey privateKeyIv privateKeySalt'
            : 'publicKey';

        const user = await User.findById(userId).select(selectFields);

        if (isOwn) {
            console.log('🔐 E2E Debug: Returning backup for owner');
            return res.status(200).json({
                publicKey: user?.publicKey || null,
                backup: {
                    encryptedPrivateKey: user?.encryptedPrivateKey || null,
                    iv: user?.privateKeyIv || null,
                    salt: user?.privateKeySalt || null
                }
            });
        }

        res.status(200).json({ publicKey: user?.publicKey || null });
    } catch (error) {
        console.error("Error in getUserPublicKey:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// E2E Encryption: Update current user's public key and private key backup
exports.updatePublicKey = async (req, res) => {
    try {
        const { publicKey, backup } = req.body;
        console.log('🔐 E2E Debug: Updating key/backup for', req.user.id, { hasBackup: !!backup });

        const updateData = { publicKey };

        if (backup) {
            updateData.encryptedPrivateKey = backup.encryptedPrivateKey;
            updateData.privateKeyIv = backup.iv;
            updateData.privateKeySalt = backup.salt;
        } else if (backup === null) {
            // Explicitly clear backup when backup is null (key reset)
            updateData.encryptedPrivateKey = null;
            updateData.privateKeyIv = null;
            updateData.privateKeySalt = null;
        }

        const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true });
        if (!user) {
            console.error('❌ E2E Debug: User not found for update', req.user.id);
            return res.status(404).json({ error: "User not found" });
        }

        console.log('✅ E2E Debug: Update successful', {
            hasPublicKey: !!user.publicKey,
            hasBackup: !!user.encryptedPrivateKey
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error in updatePublicKey:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
