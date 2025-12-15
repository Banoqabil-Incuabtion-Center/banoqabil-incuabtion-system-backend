const mongoose = require("mongoose");

// Generic attendance settings that admin can customize
const AttendanceSettingsSchema = mongoose.Schema({
    // Shift configurations
    shifts: {
        Morning: {
            name: { type: String, default: "Morning" },
            startHour: { type: Number, default: 9 },      // 9:00 AM
            endHour: { type: Number, default: 15 },       // 3:00 PM
            lateThresholdMinutes: { type: Number, default: 60 },       // Late after 1 hour
            earlyLeaveThresholdMinutes: { type: Number, default: 60 }, // Early if leave 1hr before end
            noCheckoutLateMinutes: { type: Number, default: 60 },      // Mark late if no checkout after 1hr
            minHoursForPresent: { type: Number, default: 4 }           // Min 4 hours for valid attendance
        },
        Evening: {
            name: { type: String, default: "Evening" },
            startHour: { type: Number, default: 15 },     // 3:00 PM
            endHour: { type: Number, default: 21 },       // 9:00 PM
            lateThresholdMinutes: { type: Number, default: 60 },
            earlyLeaveThresholdMinutes: { type: Number, default: 60 },
            noCheckoutLateMinutes: { type: Number, default: 60 },
            minHoursForPresent: { type: Number, default: 4 }
        }
    },

    // Global settings
    allowEarlyCheckIn: { type: Number, default: 60 },  // Allow check-in 1 hour before shift
    timezone: { type: String, default: "Asia/Karachi" },

    // IP restrictions
    allowedIPs: [{ type: String }],

    // Auto-actions
    autoMarkAbsentTime: { type: Number, default: null }, // Hour to mark absent if no check-in (null = disabled)

    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    collection: 'attendance_settings'
});

// Ensure only one settings document exists
AttendanceSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne({ isActive: true });

    if (!settings) {
        // Create default settings if none exist
        settings = await this.create({
            shifts: {
                Morning: {
                    startHour: 9,
                    endHour: 15,
                    lateThresholdMinutes: 60,
                    earlyLeaveThresholdMinutes: 60,
                    minHoursForPresent: 4
                },
                Evening: {
                    startHour: 15,
                    endHour: 21,
                    lateThresholdMinutes: 60,
                    earlyLeaveThresholdMinutes: 60,
                    minHoursForPresent: 4
                }
            },
            allowEarlyCheckIn: 60,
            timezone: "Asia/Karachi",
            allowedIPs: [],
            isActive: true
        });
    }

    return settings;
};

module.exports = mongoose.model('AttendanceSettings', AttendanceSettingsSchema);
