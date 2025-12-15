const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ["error", "warn", "info"],
        default: "error",
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    stack: {
        type: String,
    },
    route: {
        type: String,
    },
    method: {
        type: String,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    body: {
        type: Object, // Store sanitized body
    },
    query: {
        type: Object,
    },
    params: {
        type: Object,
    },
    ip: {
        type: String,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        expires: 30 * 24 * 60 * 60, // TTL: 30 days in seconds
    },
});

module.exports = mongoose.model("Log", logSchema);
