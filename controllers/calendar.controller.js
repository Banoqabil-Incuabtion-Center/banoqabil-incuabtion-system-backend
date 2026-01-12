const Calendar = require("../models/calendar.model");
const CalendarSettings = require("../models/calendar-settings.model");
const AttendanceSettings = require("../models/attendance-settings.model");
const moment = require("moment-timezone");

const calendarController = {};

// ==================== SETTINGS MANAGEMENT ====================

// Get calendar settings (working days)
calendarController.getSettings = async (req, res, next) => {
    try {
        const settings = await CalendarSettings.getSettings();
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
};

// Update calendar settings (working days)
calendarController.updateSettings = async (req, res, next) => {
    try {
        const { workingDays } = req.body;

        // Validate working days
        if (!Array.isArray(workingDays) || !workingDays.every(d => d >= 0 && d <= 6)) {
            return res.status(400).json({
                success: false,
                message: "Working days must be an array of numbers between 0 (Sunday) and 6 (Saturday)"
            });
        }

        let settings = await CalendarSettings.findOne({ isActive: true });

        if (!settings) {
            settings = await CalendarSettings.create({ workingDays, isActive: true });
        } else {
            settings.workingDays = workingDays;
            await settings.save();
        }

        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
};

// ==================== CALENDAR ENTRIES ====================

// Create a new calendar entry
calendarController.createEntry = async (req, res, next) => {
    try {
        const entry = await Calendar.create({
            ...req.body,
            createdBy: req.user?._id
        });
        res.status(201).json({ success: true, data: entry });
    } catch (error) {
        next(error);
    }
};

// Get all calendar entries with optional date range filter
calendarController.getEntries = async (req, res, next) => {
    try {
        const { start, end, type } = req.query;
        const query = { deletedAt: null };

        if (start && end) {
            query.startDate = { $gte: new Date(start) };
            query.endDate = { $lte: new Date(end) };
        }

        if (type && type !== 'all') {
            query.type = type;
        }

        const entries = await Calendar.find(query).sort({ startDate: 1 });

        // Also get calendar settings for weekend info
        const settings = await CalendarSettings.getSettings();

        res.status(200).json({
            success: true,
            data: entries,
            workingDays: settings.workingDays
        });
    } catch (error) {
        next(error);
    }
};

// Update a calendar entry
calendarController.updateEntry = async (req, res, next) => {
    try {
        const entry = await Calendar.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { new: true, runValidators: true }
        );

        if (!entry) {
            return res.status(404).json({ success: false, message: "Entry not found" });
        }

        res.status(200).json({ success: true, data: entry });
    } catch (error) {
        next(error);
    }
};

// Delete a calendar entry (soft delete)
calendarController.deleteEntry = async (req, res, next) => {
    try {
        const entry = await Calendar.findByIdAndUpdate(
            req.params.id,
            { deletedAt: new Date() },
            { new: true }
        );

        if (!entry) {
            return res.status(404).json({ success: false, message: "Entry not found" });
        }

        res.status(200).json({ success: true, message: "Entry deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// ==================== ATTENDANCE INTEGRATION ====================

// Internal helper for attendance logic to check if a date is a holiday or non-working day
// This is used by attendance controller to prevent check-in/marking absent on holidays/weekends
calendarController.isNonWorkingDay = async (date) => {
    const attendanceSettings = await AttendanceSettings.getSettings();
    const calendarSettings = await CalendarSettings.getSettings();
    const targetDate = moment(date).tz(attendanceSettings.timezone).startOf("day");

    // 1. Check if it's a holiday in the calendar
    const holiday = await Calendar.findOne({
        startDate: { $lte: targetDate.toDate() },
        endDate: { $gte: targetDate.toDate() },
        type: "Holiday",
        deletedAt: null
    });

    if (holiday) return { isNonWorking: true, reason: holiday.title, type: "Holiday" };

    // 2. Check if it's a weekend/non-working day based on CALENDAR settings (not attendance settings)
    // moment().day() returns 0 for Sunday, 1 for Monday, etc.
    const dayOfWeek = targetDate.day();

    // Check if this day is NOT in the global working days
    if (!calendarSettings.workingDays.includes(dayOfWeek)) {
        const dayNames = ["Sunday", "Saturday"];
        const reason = dayOfWeek === 0 ? "Sunday" : dayOfWeek === 6 ? "Saturday" : "Non-working Day";
        return { isNonWorking: true, reason: reason, type: "Weekend" };
    }

    return { isNonWorking: false };
};

// Seed sample events for January 2026
calendarController.seedJanuaryEvents = async (req, res, next) => {
    try {
        const sampleEvents = [
            {
                title: "New Year's Day",
                description: "Happy New Year 2026!",
                type: "Holiday",
                color: "#ef4444",
                startDate: new Date("2026-01-01"),
                endDate: new Date("2026-01-01"),
                isFullDay: true,
                status: "Upcoming"
            },
            {
                title: "Kashmir Solidarity Day",
                description: "Kashmir Day - Public Holiday",
                type: "Holiday",
                color: "#ef4444",
                startDate: new Date("2026-02-05"),
                endDate: new Date("2026-02-05"),
                isFullDay: true,
                status: "Upcoming"
            },
            {
                title: "Project Kickoff Meeting",
                description: "Q1 2026 Project Kickoff",
                type: "Meeting",
                color: "#8b5cf6",
                startDate: new Date("2026-01-05"),
                endDate: new Date("2026-01-05"),
                isFullDay: false,
                status: "Upcoming",
                location: "Main Conference Room"
            },
            {
                title: "Team Monthly Review",
                description: "Monthly team progress review",
                type: "Meeting",
                color: "#8b5cf6",
                startDate: new Date("2026-01-15"),
                endDate: new Date("2026-01-15"),
                isFullDay: false,
                status: "Upcoming",
                location: "Zoom"
            },
            {
                title: "Mid-Month Assessment",
                description: "Student progress assessment",
                type: "Event",
                color: "#f59e0b",
                startDate: new Date("2026-01-20"),
                endDate: new Date("2026-01-20"),
                isFullDay: true,
                status: "Upcoming"
            }
        ];

        // Check if events already exist to avoid duplicates
        const existingCount = await Calendar.countDocuments({
            startDate: { $gte: new Date("2026-01-01"), $lte: new Date("2026-02-28") },
            deletedAt: null
        });

        if (existingCount > 0) {
            return res.status(200).json({
                success: true,
                message: "Sample events already exist",
                count: existingCount
            });
        }

        await Calendar.insertMany(sampleEvents);

        res.status(201).json({
            success: true,
            message: "Sample events created successfully",
            count: sampleEvents.length
        });
    } catch (error) {
        next(error);
    }
};

module.exports = calendarController;
