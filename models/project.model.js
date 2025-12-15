const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
    title: {
        type: String
    },

    description: {
        type: String
    },

    file: {
        type: String
    },

    teamName: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "team",
        required: true
    },

    PM: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PM",
        required: true
    },

    deletedAt: {
        type: Date,
        default: null,
    },

})

module.exports = mongoose.model("project", ProjectSchema)