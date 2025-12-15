const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const mediaController = require("../controllers/media.controller");

// Get user's media
router.get("/", protect, mediaController.getMediaByUser);

// Delete media
router.delete("/:id", protect, mediaController.deleteMedia);

module.exports = router;
