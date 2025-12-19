// controllers/comment.controller.js
const commentModel = require('../models/comment.model');
const userPostModel = require('../models/user-post.model');
const paginate = require('../utils/paginate.util');
const { getIO } = require('../socket');

const commentController = {};

// Helper function to build comment tree
const buildCommentTree = async (comments) => {
  const commentMap = new Map();
  const rootComments = [];

  // First pass: create a map of all comments
  comments.forEach(comment => {
    commentMap.set(comment._id.toString(), { ...comment, replies: [] });
  });

  // Second pass: build the tree structure
  comments.forEach(comment => {
    const commentObj = commentMap.get(comment._id.toString());
    if (comment.parentComment) {
      const parent = commentMap.get(comment.parentComment.toString());
      if (parent) {
        parent.replies.push(commentObj);
      }
    } else {
      rootComments.push(commentObj);
    }
  });

  return rootComments;
};

// Create Comment
commentController.createComment = async (req, res) => {
  try {
    const { postId, content, parentCommentId } = req.body;
    const userId = req.user.id;

    // Validation
    if (!postId || !content) {
      return res.status(400).json({
        errors: {
          postId: !postId ? "Post ID is required" : undefined,
          content: !content ? "Comment content is required" : undefined,
        }
      });
    }

    // Character limit for comment
    if (content.length > 1000) {
      return res.status(400).json({
        errors: {
          content: "Comment cannot exceed 1000 characters"
        }
      });
    }

    // Check if post exists
    const post = await userPostModel.findById(postId);
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: "Post not found" });
    }

    // If replying to a comment, validate parent comment
    if (parentCommentId) {
      const parentComment = await commentModel.findById(parentCommentId);

      if (!parentComment || parentComment.deletedAt) {
        return res.status(404).json({ message: "Parent comment not found" });
      }

      if (parentComment.post.toString() !== postId) {
        return res.status(400).json({
          message: "Parent comment does not belong to this post"
        });
      }

      // Check max depth
      if (parentComment.depth >= 5) {
        return res.status(400).json({
          message: "Maximum nesting depth reached (5 levels)"
        });
      }
    }

    // Create comment
    const newComment = await commentModel.create({
      content,
      post: postId,
      user: userId,
      parentComment: parentCommentId || null
    });

    // Populate user data
    const populatedComment = await commentModel
      .findById(newComment._id)
      .populate("user", "name avatar");

    // Emit socket event to post room
    try {
      const io = getIO();
      io.to(`post:${postId}`).emit('comment:created', {
        comment: populatedComment,
        parentCommentId: parentCommentId || null
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Continue even if socket fails
    }

    // Create Notification
    const notificationModel = require("../models/notification.model");
    const { emitNotification } = require("../socket");
    const { sendPushNotification } = require("./push.controller");

    // Initialize logic to notify post owner
    if (post.user.toString() !== userId) {
      const notification = await notificationModel.create({
        recipient: post.user,
        sender: userId,
        type: 'COMMENT',
        message: 'commented on your post',
        data: { postId, commentId: newComment._id }
      });
      const populatedNotification = await notification.populate('sender', 'name profilePicture username');
      emitNotification(post.user, populatedNotification);

      // Send Push Notification
      const sender = await require("../models/user.model").findById(req.user.id).select("name avatar");
      const pushPayload = {
        title: "New Comment",
        body: `${sender ? sender.name : 'Someone'} commented on your post`,
        icon: sender?.avatar,
        tag: 'comment',
        data: {
          url: `/posts/${postId}`,
          type: 'comment'
        }
      };
      sendPushNotification(post.user, pushPayload).catch(err => console.error("Push Err:", err));
    }

    // Identify and notify mentioned users (if any logic existed) or parent comment owner
    if (parentCommentId) {
      const parentComment = await commentModel.findById(parentCommentId);
      if (parentComment && parentComment.user.toString() !== userId && parentComment.user.toString() !== post.user.toString()) {
        const notification = await notificationModel.create({
          recipient: parentComment.user,
          sender: userId,
          type: 'COMMENT',
          message: 'replied to your comment',
          data: { postId, commentId: newComment._id, parentCommentId }
        });
        const populatedNotification = await notification.populate('sender', 'name profilePicture username');
        emitNotification(parentComment.user, populatedNotification);

        // Send Push Notification
        const sender = await require("../models/user.model").findById(req.user.id).select("name avatar");
        const pushPayload = {
          title: "New Reply",
          body: `${sender ? sender.name : 'Someone'} replied to your comment`,
          icon: sender?.avatar,
          tag: 'comment',
          data: {
            url: `/posts/${postId}`,
            type: 'comment'
          }
        };
        sendPushNotification(parentComment.user, pushPayload).catch(err => console.error("Push Err:", err));
      }
    }

    res.status(201).json({
      message: "Comment added successfully",
      comment: populatedComment
    });
  } catch (error) {
    console.error("Error creating comment:", error);

    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ errors });
    }

    return res.status(500).json({ message: "Server Error" });
  }
};

// Get Comments for a Post (with tree structure and pagination)
commentController.getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user?.id;

    // 1. Get total count of all comments for metadata
    const totalCommentsCount = await commentModel.countDocuments({ post: postId, deletedAt: null });

    // 2. Get paginated root comments (top-level only)
    const rootCommentsPaginated = await paginate({
      model: commentModel,
      page,
      limit,
      query: { post: postId, parentComment: null, deletedAt: null },
      sort: { createdAt: -1 },
      populate: { path: 'user', select: 'name avatar' }
    });

    const rootComments = rootCommentsPaginated.data.map(c => c.toObject ? c.toObject() : c);
    const rootIds = rootComments.map(c => c._id.toString());

    if (rootComments.length === 0) {
      return res.status(200).json({
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // 3. Fetch all replies for the entire post
    // Note: To be perfectly efficient, we could only fetch descendants of rootIds,
    // but fetching all replies for a post is generally safe as they are usually fewer than all root comments.
    const allReplies = await commentModel
      .find({ post: postId, parentComment: { $ne: null }, deletedAt: null })
      .populate("user", "name avatar")
      .lean();

    // 4. Combine root comments and replies for likes processing
    const allRelevantComments = [...rootComments, ...allReplies];
    const allCommentIds = allRelevantComments.map(c => c._id);

    // 5. Processing Likes
    const likeModel = require('../models/like.model');
    const likeCounts = await likeModel.aggregate([
      { $match: { comment: { $in: allCommentIds } } },
      { $group: { _id: '$comment', count: { $sum: 1 } } }
    ]);
    const likeCountMap = new Map(likeCounts.map(lc => [lc._id.toString(), lc.count]));

    let userLikedMap = new Map();
    if (userId) {
      const userLikes = await likeModel.find({
        comment: { $in: allCommentIds },
        user: userId
      }).lean();
      userLikedMap = new Map(userLikes.map(ul => [ul.comment.toString(), true]));
    }

    const commentsWithLikes = allRelevantComments.map(comment => ({
      ...comment,
      likeCount: likeCountMap.get(comment._id.toString()) || 0,
      userLiked: userLikedMap.get(comment._id.toString()) || false
    }));

    // 6. Build comment tree and filter for current page root comments
    const fullTree = await buildCommentTree(commentsWithLikes);
    const paginatedTree = fullTree.filter(c => rootIds.includes(c._id.toString()));

    res.status(200).json({
      data: paginatedTree,
      pagination: {
        currentPage: page,
        totalPages: rootCommentsPaginated.pagination.totalPages,
        totalItems: totalCommentsCount,
        itemsPerPage: limit,
        hasNextPage: rootCommentsPaginated.pagination.hasMore,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error("Error getting comments:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Update Comment
commentController.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validation
    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    if (content.length > 1000) {
      return res.status(400).json({ message: "Comment cannot exceed 1000 characters" });
    }


    // Check if comment exists and belongs to user
    const comment = await commentModel.findById(id);

    if (!comment || comment.deletedAt) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only edit your own comments"
      });
    }

    // Update comment
    const updatedComment = await commentModel.findByIdAndUpdate(
      id,
      {
        content,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("user", "name avatar");

    // Emit socket event to post room
    try {
      const io = getIO();
      io.to(`post:${comment.post}`).emit('comment:updated', {
        comment: updatedComment
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Continue even if socket fails
    }

    res.status(200).json({
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Error updating comment:", error);

    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ errors });
    }

    return res.status(500).json({ message: "Server Error" });
  }
};

// Delete Comment (with cascade delete for replies)
commentController.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if comment exists and belongs to user
    const comment = await commentModel.findById(id);

    if (!comment || comment.deletedAt) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only delete your own comments"
      });
    }

    // Soft delete the comment
    await commentModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
    });

    // Cascade soft delete all child comments
    const deleteReplies = async (parentId) => {
      const replies = await commentModel.find({
        parentComment: parentId,
        deletedAt: null
      });

      for (const reply of replies) {
        await commentModel.findByIdAndUpdate(reply._id, {
          deletedAt: new Date(),
        });
        // Recursively delete nested replies
        await deleteReplies(reply._id);
      }
    };

    await deleteReplies(id);

    // Emit socket event to post room
    try {
      const io = getIO();
      io.to(`post:${comment.post}`).emit('comment:deleted', {
        commentId: id,
        parentCommentId: comment.parentComment,
        postId: comment.post
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Continue even if socket fails
    }

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = commentController;