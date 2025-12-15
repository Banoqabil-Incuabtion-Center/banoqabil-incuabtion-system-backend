const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    type: {
        type: String,
        enum: ['LIKE', 'COMMENT', 'POST_UPLOAD', 'MESSAGE', 'SYSTEM', 'LOGIN'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        type: Object, // Flexible field to store related IDs (postId, commentId, etc.)
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
