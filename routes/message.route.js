const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const {
    sendMessage,
    getConversations,
    getMessages,
    searchUsers,
    markAsRead,
    getUnreadCount,
    getUserPublicKey,
    updatePublicKey,
} = require("../controllers/message.controller");

router.use(protect);


router.get("/search", searchUsers);
router.get("/unread-count", getUnreadCount);
router.post("/send", sendMessage);
router.get("/conversations", getConversations);
router.put("/read", markAsRead);

// E2E Encryption routes
router.get("/public-key/:userId", getUserPublicKey);
router.put("/public-key", updatePublicKey);

router.get("/:id", getMessages);

module.exports = router;

