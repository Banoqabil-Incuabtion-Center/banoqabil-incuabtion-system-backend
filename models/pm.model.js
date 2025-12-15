const mongoose = require("mongoose");

const PMSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: {
        type: String,
    },

    project:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "project"
    }
    ,
    createdAt: {
        type: Date,
        default: Date.now
    },
    deletedAt: {
        type: Date,
        default: null
    }
})

module.exports = mongoose.model("PM", PMSchema);