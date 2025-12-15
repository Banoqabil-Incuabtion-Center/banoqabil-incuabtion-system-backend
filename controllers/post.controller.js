// post.controller.js (Admin Posts)
const postModel = require('../models/post.model');
const path = require("path");
const fs = require("fs");
const paginate = require('../utils/paginate.util');

const postController = {};

// Create Post (Admin)
postController.createPost = async (req, res) => {
  try {
    const { title, description, link } = req.body;

    await postModel.create({ title, description, link });

    res.status(201).json({ message: "Post created successfully" });
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Get Posts with Pagination (Admin)
postController.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      model: postModel,
      page,
      limit,
      query: { deletedAt: null },  // filter
      sort: { createdAt: -1 },     // latest first
      populate: { path: "user", select: "name" }, // populate
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error getting posts:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Update Post (Admin)
postController.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, link, existingImage } = req.body;

    let imagePath = existingImage;

    // if a new file is uploaded, replace the image
    if (req.file) {
      imagePath = `/images/${req.file.filename}`;

      // Delete old image if exists and not same as default
      if (existingImage && fs.existsSync(path.join(__dirname, `../public${existingImage}`))) {
        fs.unlinkSync(path.join(__dirname, `../public${existingImage}`));
      }
    }

    await postModel.findByIdAndUpdate(id, {
      title,
      description,
      link,
      image: imagePath,
    });

    res.status(200).json({ message: "Post updated successfully" });
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Delete Post (Admin)
postController.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    await postModel.findByIdAndUpdate(id, { deletedAt: new Date() });
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = postController;