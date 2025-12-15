// routes/comment.route.js
const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { protect } = require("../middlewares/auth.middleware");

router.post("/createcomment", protect, commentController.createComment);
router.get("/post/:postId/comments", protect, commentController.getCommentsByPost);
router.put("/updatecomment/:id", protect, commentController.updateComment);
router.delete("/deletecomment/:id", protect, commentController.deleteComment);

module.exports = router;