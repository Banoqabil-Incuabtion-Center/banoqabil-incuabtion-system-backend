const likeModel = require("../models/like.model");
const userPostModel = require("../models/user-post.model");
const postModel = require("../models/post.model");
const commentModel = require("../models/comment.model");
const { getIO } = require("../socket");

const likeController = {};

// Helper to find post in either model
const findPost = async (postId) => {
    let post = await userPostModel.findById(postId);
    if (!post) {
        post = await postModel.findById(postId);
    }
    return post;
};

// Toggle like - Like or unlike a post
likeController.toggleLike = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;

        console.log("👉 toggleLike called for:", postId, "by user:", userId);

        // Check if post exists in either model
        const post = await findPost(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        // Check if user already liked the post
        const existingLike = await likeModel.findOne({ user: userId, post: postId });

        if (existingLike) {
            // Unlike - remove the like
            await likeModel.findByIdAndDelete(existingLike._id);

            // Get updated like count
            const likeCount = await likeModel.countDocuments({ post: postId });

            // Emit Socket.IO event
            const io = getIO();
            io.to(`post:${postId}`).emit("like:removed", {
                postId,
                userId,
                likeCount,
            });

            return res.status(200).json({
                message: "Post unliked successfully",
                liked: false,
                likeCount,
            });
        } else {
            // Like - create new like
            const newLike = await likeModel.create({
                user: userId,
                post: postId,
            });

            // Populate user data
            await newLike.populate("user", "name email");

            // Get updated like count
            const likeCount = await likeModel.countDocuments({ post: postId });

            // Emit Socket.IO event
            const io = getIO();
            io.to(`post:${postId}`).emit("like:added", {
                postId,
                like: {
                    _id: newLike._id,
                    user: newLike.user,
                    createdAt: newLike.createdAt,
                },
                likeCount,
            });

            // Create Notification
            const notificationModel = require("../models/notification.model");
            const { emitNotification } = require("../socket");
            const { sendPushNotification } = require("./push.controller");

            // Only notify if liking someone else's post
            if (post.user.toString() !== userId) {
                const notification = await notificationModel.create({
                    recipient: post.user,
                    sender: userId,
                    type: 'LIKE',
                    message: 'liked your post',
                    data: { postId }
                });

                const populatedNotification = await notification.populate('sender', 'name profilePicture username');
                emitNotification(post.user, populatedNotification);

                // Send Push Notification
                const sender = await require("../models/user.model").findById(req.user.id).select("name avatar");
                const pushPayload = {
                    title: "New Like",
                    body: `${sender ? sender.name : 'Someone'} liked your post`,
                    icon: sender?.avatar,
                    tag: 'like',
                    data: {
                        url: `/posts/${postId}`,
                        type: 'like'
                    }
                };
                sendPushNotification(post.user, pushPayload).catch(err => console.error("Push Err:", err));
            }

            return res.status(201).json({
                message: "Post liked successfully",
                liked: true,
                likeCount,
            });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        return res.status(500).json({
            error: "Server Error",
            details: error.message,
        });
    }
};

// Toggle like for a comment
likeController.toggleCommentLike = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        console.log("👉 toggleCommentLike called for:", commentId, "by user:", userId);

        // Check if comment exists
        const comment = await commentModel.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        const postId = comment.post;

        // Check if user already liked the comment
        const existingLike = await likeModel.findOne({ user: userId, comment: commentId });

        if (existingLike) {
            // Unlike - remove the like
            await likeModel.findByIdAndDelete(existingLike._id);

            // Get updated like count
            const likeCount = await likeModel.countDocuments({ comment: commentId });

            // Emit Socket.IO event
            const io = getIO();
            io.to(`post:${postId}`).emit("comment:like:removed", {
                commentId,
                userId,
                likeCount,
            });

            return res.status(200).json({
                message: "Comment unliked successfully",
                liked: false,
                likeCount,
            });
        } else {
            // Like - create new like
            const newLike = await likeModel.create({
                user: userId,
                comment: commentId,
            });

            // Populate user data
            await newLike.populate("user", "name email");

            // Get updated like count
            const likeCount = await likeModel.countDocuments({ comment: commentId });

            // Emit Socket.IO event
            const io = getIO();
            io.to(`post:${postId}`).emit("comment:like:added", {
                commentId,
                like: {
                    _id: newLike._id,
                    user: newLike.user,
                    createdAt: newLike.createdAt,
                },
                likeCount,
            });

            // Create Notification
            const notificationModel = require("../models/notification.model");
            const { emitNotification } = require("../socket");
            const { sendPushNotification } = require("./push.controller");

            // Notify comment owner if it's not the liker
            if (comment.user.toString() !== userId) {
                const notification = await notificationModel.create({
                    recipient: comment.user,
                    sender: userId,
                    type: 'LIKE',
                    message: 'liked your comment',
                    data: { postId, commentId }
                });

                const populatedNotification = await notification.populate('sender', 'name profilePicture username');
                emitNotification(comment.user, populatedNotification);

                // Send Push Notification
                const sender = await require("../models/user.model").findById(req.user.id).select("name avatar");
                const pushPayload = {
                    title: "New Like",
                    body: `${sender ? sender.name : 'Someone'} liked your comment`,
                    icon: sender?.avatar,
                    tag: 'like',
                    data: {
                        url: `/posts/${postId}`,
                        type: 'like'
                    }
                };
                sendPushNotification(comment.user, pushPayload).catch(err => console.error("Push Err:", err));
            }

            return res.status(201).json({
                message: "Comment liked successfully",
                liked: true,
                likeCount,
            });
        }
    } catch (error) {
        console.error("Error toggling comment like:", error);
        return res.status(500).json({
            error: "Server Error",
            details: error.message,
        });
    }
};

// Get all likes for a post with pagination
likeController.getLikesByPost = async (req, res) => {
    try {
        const { postId } = req.params;
        console.log("🔍 getLikesByPost called for:", postId);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Check if post exists in either model
        const post = await findPost(postId);
        if (!post) {
            console.log("❌ Post not found:", postId);
            return res.status(404).json({ error: "Post not found" });
        }

        // Get likes with pagination
        const likes = await likeModel
            .find({ post: postId })
            .populate("user", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count
        const totalLikes = await likeModel.countDocuments({ post: postId });

        // Check if current user liked the post
        const userLiked = req.user
            ? await likeModel.exists({ user: req.user.id, post: postId })
            : false;

        return res.status(200).json({
            data: likes,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalLikes / limit),
                totalItems: totalLikes,
                itemsPerPage: limit,
                hasNextPage: page * limit < totalLikes,
                hasPrevPage: page > 1,
            },
            userLiked: !!userLiked,
        });
    } catch (error) {
        console.error("Error fetching likes:", error);
        return res.status(500).json({
            error: "Server Error",
            details: error.message,
        });
    }
};

// Get all likes for a comment with pagination
likeController.getCommentLikes = async (req, res) => {
    try {
        const { commentId } = req.params;
        console.log("🔍 getCommentLikes called for:", commentId);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Check if comment exists
        const comment = await commentModel.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        // Get likes with pagination
        const likes = await likeModel
            .find({ comment: commentId })
            .populate("user", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count
        const totalLikes = await likeModel.countDocuments({ comment: commentId });

        // Check if current user liked the comment
        const userLiked = req.user
            ? await likeModel.exists({ user: req.user.id, comment: commentId })
            : false;

        return res.status(200).json({
            data: likes,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalLikes / limit),
                totalItems: totalLikes,
                itemsPerPage: limit,
                hasNextPage: page * limit < totalLikes,
                hasPrevPage: page > 1,
            },
            userLiked: !!userLiked,
        });
    } catch (error) {
        console.error("Error fetching comment likes:", error);
        return res.status(500).json({
            error: "Server Error",
            details: error.message,
        });
    }
};

module.exports = likeController;
