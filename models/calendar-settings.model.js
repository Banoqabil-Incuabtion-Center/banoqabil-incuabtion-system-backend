const mongoose = require("mongoose");

// Global calendar settings for working days management
const CalendarSettingsSchema = mongoose.Schema({
    // Working days configuration (0=Sunday, 1=Monday, ..., 6=Saturday)
    workingDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5], // Monday to Friday
        validate: {
            validator: function (arr) {
                return arr.every(day => day >= 0 && day <= 6);
            },
            message: "Working days must be between 0 (Sunday) and 6 (Saturday)"
        }
    },

    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    collection: 'calendar_settings'
});

// Ensure only one settings document exists
CalendarSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne({ isActive: true });

    if (!settings) {
        // Create default settings if none exist
        settings = await this.create({
            workingDays: [1, 2, 3, 4, 5], // Mon-Fri
            isActive: true
        });
    }

    return settings;
};

module.exports = mongoose.model('CalendarSettings', CalendarSettingsSchema);
