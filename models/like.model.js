const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userpost",
            required: false, // Changed to false to allow comment likes
        },
        comment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "comment",
            required: false,
        }
    },
    {
        timestamps: true,
    }
);

// Ensure a user can only like a post once (only for non-null post values)
likeSchema.index(
    { user: 1, post: 1 },
    {
        unique: true,
        partialFilterExpression: { post: { $type: "objectId" } }
    }
);

// Ensure a user can only like a comment once (only for non-null comment values)
likeSchema.index(
    { user: 1, comment: 1 },
    {
        unique: true,
        partialFilterExpression: { comment: { $type: "objectId" } }
    }
);

// Index for efficient querying of likes by post
likeSchema.index({ post: 1, createdAt: -1 });

// Index for efficient querying of likes by comment
likeSchema.index({ comment: 1, createdAt: -1 });

const likeModel = mongoose.model("like", likeSchema);

module.exports = likeModel;
