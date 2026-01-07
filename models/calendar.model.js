const mongoose = require("mongoose");

const CalendarSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    type: {
        type: String,
        enum: ["Holiday", "Event", "Meeting", "Working Day", "Other"],
        default: "Event",
    },
    color: {
        type: String,
        default: "#3b82f6", // Default blue
    },
    startDate: {
        type: Date,
        required: [true, "Start date is required"],
    },
    endDate: {
        type: Date,
        required: [true, "End date is required"],
    },
    isFullDay: {
        type: Boolean,
        default: true,
    },
    status: {
        type: String,
        enum: ["Upcoming", "Completed", "Cancelled"],
        default: "Upcoming",
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    location: {
        type: String,
        trim: true,
    },
    recurrence: {
        type: String,
        enum: ["None", "Daily", "Weekly", "Monthly", "Yearly"],
        default: "None",
    },
    deletedAt: {
        type: Date,
        default: null,
    }
}, {
    timestamps: true,
});

// Middleware to ensure endDate is not before startDate
CalendarSchema.pre("save", function (next) {
    if (this.endDate < this.startDate) {
        return next(new Error("End date cannot be before start date"));
    }
    next();
});

module.exports = mongoose.model("Calendar", CalendarSchema);
