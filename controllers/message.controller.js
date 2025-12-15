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
        const { message, receiverId } = req.body;
        const senderId = req.user.id;
        const senderName = req.user.name; // Assuming user middleware populates name, or need to fetch

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
        });

        await newMessage.save();

        conversation.lastMessage = newMessage._id;
        await conversation.save();

        // Socket.IO logic
        try {
            const io = getIO();
            io.to(receiverId).emit("newMessage", newMessage);

            // Send Push Notification
            // We need sender details for the push notification title/body
            const sender = await User.findById(senderId).select("name avatar");
            console.log("Preparing push notification for message from:", sender?.name);

            const pushPayload = {
                title: `New Message from ${sender ? sender.name : 'Unknown'}`,
                body: message.length > 50 ? message.substring(0, 50) + "..." : message,
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
        const conversations = await Conversation.find({
            participants: senderId,
        })
            .populate("participants", "name avatar email") // Populate participant details
            .populate("lastMessage")
            .sort({ updatedAt: -1 }); // Latest conversations first

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

        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] },
        });

        if (!conversation) {
            return res.status(200).json([]);
        }

        const messages = await Message.find({
            conversationId: conversation._id,
        })
            .populate("sender", "name avatar email")
            .sort({ createdAt: 1 }); // Sorting by oldest first

        res.status(200).json(messages);
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
