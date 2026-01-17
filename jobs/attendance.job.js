const cron = require("node-cron");
const moment = require("moment-timezone");
const User = require("../models/user.model");
const Attendance = require("../models/attendance.model");
const AttendanceSettings = require("../models/attendance-settings.model");
const Calendar = require("../models/calendar.model");

const markAbsentJob = async (options = {}) => {
    const { dryRun = false } = options;
    try {
        console.log(`⏳ Running ${dryRun ? "[DRY RUN] " : ""}automated absence marking job...`);
        const settings = await AttendanceSettings.getSettings();
        const timezone = settings.timezone || "Asia/Karachi";

        // Target Date: Yesterday (since this job now runs at 00:30 AM the next day)
        const now = moment().tz(timezone);
        const targetDate = now.clone().subtract(1, 'days');
        const targetDateString = targetDate.format("YYYY-MM-DD");

        // 🔒 Locking Mechanism: Atomic check to ensure job runs only once per target date (skip for dry runs)
        if (!dryRun) {
            const lockAcquired = await AttendanceSettings.findOneAndUpdate(
                {
                    _id: settings._id,
                    lastAutomatedRunDate: { $ne: targetDateString } // Only proceed if NOT already executed for this date
                },
                {
                    $set: { lastAutomatedRunDate: targetDateString }
                }
            );

            if (!lockAcquired) {
                console.log(`⚠️ Attendance Job already ran for ${targetDateString}. Skipping to prevent duplicates.`);
                return { success: true, message: "Job already executed for this date.", skipped: true };
            }
        }

        console.log(`Checking attendance for: ${targetDateString}`);

        const targetDay = targetDate.day(); // 0=Sun, 1=Mon...

        // Start/End of target day for query
        const startOfDay = targetDate.clone().startOf("day").toDate();
        const endOfDay = targetDate.clone().endOf("day").toDate();

        // 🗓️ Check for Calendar Events (Holiday / Working Day)
        // We look for any event that overlaps with the target day and is of type Holiday or Working Day
        const calendarEvent = await Calendar.findOne({
            type: { $in: ["Holiday", "Working Day"] },
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay },
            deletedAt: null
        });

        const isGlobalHoliday = calendarEvent?.type === "Holiday";
        const isForcedWorkingDay = calendarEvent?.type === "Working Day";

        if (isGlobalHoliday) console.log(`🎉 Holiday detected: ${calendarEvent.title}`);
        if (isForcedWorkingDay) console.log(`💼 Forced Working Day detected: ${calendarEvent.title}`);

        // Fetch all active users
        const users = await User.find({ deletedAt: null });

        let parsedUsers = 0;
        let markedAbsent = 0;
        let markedHoliday = 0;

        for (const user of users) {
            parsedUsers++;

            // 1. Check if attendance exists for TARGET DATE
            const exists = await Attendance.findOne({
                user: user._id,
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            });

            if (!exists) {
                // 2. Handle Holiday
                if (isGlobalHoliday) {
                    if (!dryRun) {
                        await Attendance.create({
                            user: user._id,
                            shift: user.shift || "Morning",
                            status: "Holiday",
                            checkInTime: null,
                            checkOutTime: null,
                            hoursWorked: 0,
                            isLate: false,
                            isEarlyLeave: false,
                            createdAt: startOfDay
                        });
                        console.log(`Marked ${user.name} as Holiday for ${targetDateString}`);
                    } else {
                        console.log(`[DRY RUN] Would mark ${user.name} as Holiday`);
                    }
                    markedHoliday++;
                    continue; // Skip to next user
                }

                // 3. Determine Working Status
                let shouldMarkAbsent = false;

                if (isForcedWorkingDay) {
                    shouldMarkAbsent = true; // It's a working day for everyone
                } else {
                    // Standard Logic: Check user's working days
                    let workingDays = user.workingDays;
                    if (!workingDays || workingDays.length === 0) {
                        if (user.shift && settings.shifts[user.shift]) {
                            workingDays = settings.shifts[user.shift].workingDays;
                        }
                    }
                    if (!workingDays) workingDays = [1, 2, 3, 4, 5]; // Default Mon-Fri

                    if (workingDays.includes(targetDay)) {
                        shouldMarkAbsent = true;
                    }
                }

                // 4. Mark Absent if needed
                if (shouldMarkAbsent) {
                    if (!dryRun) {
                        await Attendance.create({
                            user: user._id,
                            shift: user.shift || "Morning", // Fallback if missing
                            status: "Absent",
                            checkInTime: null,
                            checkOutTime: null,
                            hoursWorked: 0,
                            isLate: false,
                            isEarlyLeave: false,
                            createdAt: startOfDay // Backdate
                        });

                        // Increment Absent Count
                        await User.findByIdAndUpdate(user._id, { $inc: { "attendanceStats.absent": 1 } });
                        console.log(`Marked ${user.name} as Absent for ${targetDateString}`);
                    } else {
                        console.log(`[DRY RUN] Would mark ${user.name} as Absent`);
                    }
                    markedAbsent++;
                }
            }
        }

        console.log(`✅ Absence Job Completed. ${dryRun ? "[DRY RUN] " : ""}Processed ${parsedUsers} users. Absent: ${markedAbsent}, Holiday: ${markedHoliday}.`);
        return { success: true, parsedUsers, markedAbsent, markedHoliday, dryRun };

    } catch (error) {
        console.error("❌ Error in absence marking job:", error);
        throw error;
    }
};

const initAttendanceJobs = () => {
    // Run every day at 00:30 (12:30 AM) Pakistan Time (checking previous day)
    cron.schedule("30 0 * * *", markAbsentJob, {
        timezone: "Asia/Karachi"
    });

    console.log("✅ Attendance Cron Job Initialized (00:30 PKT daily)");
};

module.exports = { initAttendanceJobs, markAbsentJob };
