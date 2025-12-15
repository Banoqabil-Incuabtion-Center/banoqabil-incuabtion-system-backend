const express = require("express");
const likeController = require("../controllers/like.controller");
const { protect, optionalProtect } = require("../middlewares/auth.middleware");

const router = express.Router();

// Test route
router.get("/test", (req, res) => res.send("Like route working"));

// Toggle comment like - MUST come before /toggle/:postId to avoid route conflict
router.post("/toggle/comment/:commentId", protect, likeController.toggleCommentLike);

// Toggle like (like/unlike post)
router.post("/toggle/:postId", protect, likeController.toggleLike);

// Get likes for a post (Public but checks auth status)
router.get("/post/:postId", (req, res, next) => {
    console.log("👉 Like route hit:", req.params.postId);
    next();
}, optionalProtect, likeController.getLikesByPost);

// Get likes for a comment
router.get("/comment/:commentId", optionalProtect, likeController.getCommentLikes);

module.exports = router;
