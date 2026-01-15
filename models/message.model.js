const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "conversation",
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
        // Store sender's public key at time of sending to ensure 
        // message can be decrypted even if sender changes key later.
        senderPublicKey: {
            type: String,
            default: null,
        },
        // E2E Encryption fields
        iv: {
            type: String,
            default: null,
        },
        isEncrypted: {
            type: Boolean,
            default: false,
        },
        seenBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "user",
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("message", messageSchema);
