const cron = require("node-cron");
const moment = require("moment-timezone");
const User = require("../models/user.model");
const Attendance = require("../models/attendance.model");
const AttendanceSettings = require("../models/attendance-settings.model");

const markAbsentJob = async (options = {}) => {
    const { dryRun = false } = options;
    try {
        console.log(`⏳ Running ${dryRun ? "[DRY RUN] " : ""}automated absence marking job...`);
        const settings = await AttendanceSettings.getSettings();
        const timezone = settings.timezone || "Asia/Karachi";
        const now = moment().tz(timezone);
        const todayDay = now.day(); // 0=Sun, 1=Mon...

        // Start/End of today for query
        const startOfDay = now.clone().startOf("day").toDate();
        const endOfDay = now.clone().endOf("day").toDate();

        // Fetch all active users
        const users = await User.find({ deletedAt: null });

        let parsedUsers = 0;
        let markedAbsent = 0;

        for (const user of users) {
            parsedUsers++;

            // 1. Determine Working Days
            let workingDays = user.workingDays;
            if (!workingDays || workingDays.length === 0) {
                // Fallback to shift settings
                if (user.shift && settings.shifts[user.shift]) {
                    workingDays = settings.shifts[user.shift].workingDays;
                }
            }

            // If still no working days defined (e.g. no shift?), default to Mon-Fri
            if (!workingDays) {
                workingDays = [1, 2, 3, 4, 5];
            }

            // 2. Check if today is a working day for this user
            // if (!workingDays.includes(todayDay)) {
            //     continue; // Not a working day, skip
            // }

            // 3. Check if attendance exists
            const exists = await Attendance.findOne({
                user: user._id,
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            });

            if (!exists) {
                // 4. Mark Absent
                if (!dryRun) {
                    await Attendance.create({
                        user: user._id,
                        shift: user.shift || "Morning", // Fallback if missing
                        status: "Absent",
                        checkInTime: null,
                        checkOutTime: null,
                        hoursWorked: 0,
                        isLate: false,
                        isEarlyLeave: false
                    });

                    // Increment Absent Count in User Stats
                    await User.findByIdAndUpdate(user._id, { $inc: { "attendanceStats.absent": 1 } });
                    console.log(`Marked ${user.name} as Absent for ${now.format("YYYY-MM-DD")}`);
                } else {
                    console.log(`[DRY RUN] Would mark ${user.name} as Absent for ${now.format("YYYY-MM-DD")}`);
                }
                markedAbsent++;
            }
        }

        console.log(`✅ Absence Job Completed. ${dryRun ? "[DRY RUN] " : ""}Processed ${parsedUsers} users. ${dryRun ? "Would have marked" : "Marked"} ${markedAbsent} as Absent.`);
        return { success: true, parsedUsers, markedAbsent, dryRun };

    } catch (error) {
        console.error("❌ Error in absence marking job:", error);
        throw error;
    }
};

const initAttendanceJobs = () => {
    // Run every day at 23:55 (11:55 PM) Pakistan Time
    cron.schedule("55 23 * * *", markAbsentJob, {
        timezone: "Asia/Karachi"
    });

    console.log("✅ Attendance Cron Job Initialized (23:55 PKT daily)");
};

module.exports = { initAttendanceJobs, markAbsentJob };
