const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const {
    sendMessage,
    getConversations,
    getMessages,
    searchUsers,
    markAsRead,
} = require("../controllers/message.controller");

router.use(protect);


router.get("/search", searchUsers);
router.post("/send", sendMessage);
router.get("/conversations", getConversations);
router.put("/read", markAsRead);
router.get("/:id", getMessages);

module.exports = router;
