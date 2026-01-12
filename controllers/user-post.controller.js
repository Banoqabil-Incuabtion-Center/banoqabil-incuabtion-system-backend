const userPostModel = require('../models/user-post.model');
const User = require("../models/user.model");
const paginate = require('../utils/paginate.util');
const { getIO } = require("../socket");
const mediaController = require('./media.controller');
const mongoose = require('mongoose');

const userPostController = {};

// Create User Post
userPostController.createUserPost = async (req, res) => {
  try {
    const { title, description, link, aspectRatio } = req.body;
    const userId = req.user.id;

    console.log("User ID:", userId);
    console.log("Files received:", req.files?.length || 0);

    // Validation - description is required, title is optional
    if (!description) {
      return res.status(400).json({
        errors: {
          description: "Description is required",
        }
      });
    }

    // Character count validation for title (if provided)
    if (title && title.length > 50) {
      return res.status(400).json({
        errors: {
          title: "Title cannot exceed 50 characters",
        }
      });
    }

    // Character count validation for description
    if (description.length > 5000) {
      return res.status(400).json({
        errors: {
          description: "Description cannot exceed 5000 characters",
        }
      });
    }

    // Handle multiple image uploads
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const imageUrl = file.path; // Cloudinary returns the URL in path
        imageUrls.push(imageUrl);

        // Create media record for each image
        await mediaController.createMediaRecord({
          url: imageUrl,
          publicId: file.filename, // Cloudinary public_id
          type: 'post_image',
          userId: userId,
          postId: null, // Will update after post is created
          file: file,
        });
      }
    }

    // Create post with user ID and images array
    const newPost = await userPostModel.create({
      title: title || '',
      description,
      link,
      images: imageUrls,
      // Also set legacy image field for backward compatibility
      image: imageUrls.length > 0 ? imageUrls[0] : null,
      aspectRatio: aspectRatio || '4:5',
      user: userId
    });

    // Update media records with post ID
    if (imageUrls.length > 0) {
      const Media = require('../models/media.model');
      await Media.updateMany(
        { url: { $in: imageUrls }, user: userId },
        { post: newPost._id }
      );
    }

    // Post create hone ke baad user data populate karke return karo
    const populatedPost = await userPostModel
      .findById(newPost._id)
      .populate("user", "name avatar");

    // Emit socket event
    const io = getIO();
    io.emit("post:created", { post: populatedPost });

    res.status(201).json({
      message: "Post created successfully",
      post: populatedPost
    });
  } catch (error) {
    console.error("Error creating post:", error);

    // Validation errors handle karein
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

// Get User Posts with Pagination
userPostController.getUserPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      model: userPostModel,
      page,
      limit,
      query: { deletedAt: null },  // filter
      sort: { createdAt: -1 },     // latest first
      populate: { path: "user", select: "name avatar" }, // populate
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error getting posts:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// ✅ OPTIMIZED: Get User Posts with Stats (likeCount, commentCount) in single query
userPostController.getUserPostsWithStats = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.query.userId; // Optional: filter by user
    const currentUserId = req.user.id; // Logged in user for like status

    // console.log("👉 getUserPostsWithStats called. CurrentUser:", currentUserId);

    const skip = (page - 1) * limit;

    // Build match query
    const matchQuery = { deletedAt: null };
    if (userId) {
      const mongoose = require('mongoose');
      matchQuery.user = new mongoose.Types.ObjectId(userId);
    }

    // Aggregation pipeline with $lookup for likes and comments
    const pipeline = [
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Lookup user info
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      // Lookup likes count
      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'post',
          as: 'likes'
        }
      },
      // Lookup comments count
      {
        $lookup: {
          from: 'comments',
          let: { postId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$post', '$$postId'] }, deletedAt: null } }
          ],
          as: 'comments'
        }
      },
      // Add computed fields
      {
        $addFields: {
          likeCount: { $size: '$likes' },
          commentCount: { $size: '$comments' },
          user: { $arrayElemAt: ['$userInfo', 0] },
          userLiked: {
            $in: [new mongoose.Types.ObjectId(currentUserId), '$likes.user']
          },
          // Computed allImages for backward compatibility
          allImages: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$images', []] } }, 0] },
              then: '$images',
              else: { $cond: { if: '$image', then: ['$image'], else: [] } }
            }
          }
        }
      },
      // Project only needed fields
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          link: 1,
          image: 1,
          images: 1,
          allImages: 1,
          aspectRatio: 1,
          createdAt: 1,
          likeCount: 1,
          commentCount: 1,
          userLiked: 1,
          'user._id': 1,
          'user.name': 1,
          'user.avatar': 1
        }
      }
    ];

    const posts = await userPostModel.aggregate(pipeline);

    // Get total count for pagination
    const totalCount = await userPostModel.countDocuments(matchQuery);
    const totalPages = Math.ceil(totalCount / limit);

    // console.log(`👉 Fetched ${posts.length} posts. First post liked? ${posts[0]?.userLiked}`);

    res.status(200).json({
      data: posts,
      pagination: {
        currentPage: page,
        totalPages,
        total: totalCount,
        limit,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error("Error getting posts with stats:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Update User Post
userPostController.updateUserPost = async (req, res) => {
  try {
    const { id, title, description, link } = req.body;
    const userId = req.user.id;

    console.log("Updating Post ID:", id);

    // Validation
    if (!id) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    // Check if post exists and belongs to user
    const post = await userPostModel.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only edit your own posts"
      });
    }

    // Validation
    const errors = {};
    if (title) {
      if (title.length > 50) {
        errors.title = "Title cannot exceed 50 characters";
      }
    }
    if (description) {
      if (description.length > 5000) {
        errors.description = "Description cannot exceed 5000 characters";
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    // Handle image update
    let finalImages = [];

    // If mediaOrder is provided, we follow it to reconstruct the image list
    // mediaOrder should be a JSON string of array: ["old_url", "new-0", "old_url_2"]
    if (req.body.mediaOrder) {
      let mediaOrder = [];
      try {
        mediaOrder = JSON.parse(req.body.mediaOrder);
      } catch (e) {
        console.error("Failed to parse mediaOrder", e);
        mediaOrder = [];
      }

      const newFiles = req.files || [];
      const currentImages = post.images || (post.image ? [post.image] : []);

      // 1. Identify valid existing images from mediaOrder
      const keptImages = mediaOrder.filter(item => !item.startsWith('new-'));

      // 2. Identify images to delete (present in DB but not in keptImages)
      // We only delete images that were associated with THIS post
      const imagesToDelete = currentImages.filter(url => !keptImages.includes(url));

      if (imagesToDelete.length > 0) {
        await mediaController.deleteMediaByUrls(imagesToDelete);
      }

      // 3. Reconstruct final array
      for (const item of mediaOrder) {
        if (item.startsWith('new-')) {
          // It's a new file
          const index = parseInt(item.split('-')[1]);
          if (newFiles[index]) {
            const file = newFiles[index];
            const imageUrl = file.path;
            finalImages.push(imageUrl);

            // Create media record
            await mediaController.createMediaRecord({
              url: imageUrl,
              publicId: file.filename,
              type: 'post_image',
              userId: userId,
              postId: id,
              file: file,
            });
          }
        } else {
          // It's an existing image URL
          if (keptImages.includes(item)) {
            finalImages.push(item);
          }
        }
      }
    } else {
      // Fallback/Legacy: If no mediaOrder, but files provided -> replace all
      if (req.files && req.files.length > 0) {
        await mediaController.deleteMediaByPost(id);
        for (const file of req.files) {
          const imageUrl = file.path;
          finalImages.push(imageUrl);
          await mediaController.createMediaRecord({
            url: imageUrl,
            publicId: file.filename,
            type: 'post_image',
            userId: userId,
            postId: id,
            file: file,
          });
        }
      } else {
        // No files, no order -> keep existing
        finalImages = post.images || (post.image ? [post.image] : []);
      }
    }

    // Update post
    const updatedPost = await userPostModel.findByIdAndUpdate(
      id,
      {
        title,
        description,
        link,
        images: finalImages,
        image: finalImages.length > 0 ? finalImages[0] : null,
        aspectRatio: req.body.aspectRatio || post.aspectRatio,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("user", "name avatar");

    // Emit socket event
    const io = getIO();
    io.emit("post:updated", { post: updatedPost });

    res.status(200).json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post:", error);

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

// Delete User Post
userPostController.deleteUserPost = async (req, res) => {
  try {
    const { id } = req.body;
    const userId = req.user.id;

    console.log("Deleting Post ID:", id);

    // Validation
    if (!id) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    // Check if post exists and belongs to user
    const post = await userPostModel.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only delete your own posts"
      });
    }

    // Delete associated media from Cloudinary
    if (post.image) {
      await mediaController.deleteMediaByPost(id);
    }

    // Soft delete (recommended)
    await userPostModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
    });

    // Emit socket event
    const io = getIO();
    io.emit("post:deleted", { postId: id });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Get Single Post Detail with Stats
userPostController.getPostDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Post ID" });
    }

    // Aggregation pipeline for single post with stats
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(id), deletedAt: null } },
      // Lookup user info
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      // Lookup likes count
      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'post',
          as: 'likes'
        }
      },
      // Lookup comments count
      {
        $lookup: {
          from: 'comments',
          let: { postId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$post', '$$postId'] }, deletedAt: null } }
          ],
          as: 'comments'
        }
      },
      // Add computed fields
      {
        $addFields: {
          likesCount: { $size: '$likes' },
          commentsCount: { $size: '$comments' },
          user: { $arrayElemAt: ['$userInfo', 0] },
          userLiked: {
            $in: [new mongoose.Types.ObjectId(userId), '$likes.user']
          },
          allImages: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$images', []] } }, 0] },
              then: '$images',
              else: { $cond: { if: '$image', then: ['$image'], else: [] } }
            }
          }
        }
      },
      // Project fields
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          link: 1,
          image: 1,
          images: 1,
          allImages: 1,
          aspectRatio: 1,
          createdAt: 1,
          likesCount: 1,
          commentsCount: 1,
          userLiked: 1,
          'user._id': 1,
          'user.name': 1,
          'user.avatar': 1
        }
      }
    ];

    const results = await userPostModel.aggregate(pipeline);

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({
      post: results[0]
    });
  } catch (error) {
    console.error("Error getting post detail:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};



module.exports = userPostController;