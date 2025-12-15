const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },
    publicId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['post_image', 'avatar', 'other'],
        default: 'other',
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userpost',
        default: null,
    },
    filename: String,
    format: String,
    size: Number,
    createdAt: {
        type: Date,
        default: Date.now,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
});

// Index for efficient queries
mediaSchema.index({ user: 1, type: 1 });
mediaSchema.index({ post: 1 });

module.exports = mongoose.model('media', mediaSchema);
