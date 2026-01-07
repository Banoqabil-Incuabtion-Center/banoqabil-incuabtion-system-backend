const Calendar = require("../models/calendar.model");
const { getSettings } = require("./attendance.controller");
const moment = require("moment-timezone");

const calendarController = {};

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
        res.status(200).json({ success: true, data: entries });
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

// Internal helper for attendance logic to check if a date is a holiday or non-working day
calendarController.isNonWorkingDay = async (date) => {
    const settings = await getSettings();
    const targetDate = moment(date).tz(settings.timezone).startOf("day");

    // 1. Check if it's a holiday in the calendar
    const holiday = await Calendar.findOne({
        startDate: { $lte: targetDate.toDate() },
        endDate: { $gte: targetDate.toDate() },
        type: "Holiday",
        deletedAt: null
    });

    if (holiday) return { isNonWorking: true, reason: holiday.title, type: "Holiday" };

    // 2. Check if it's a weekend/non-working day based on attendance settings
    // Note: moment().day() returns 0 for Sunday, 1 for Monday, etc.
    const dayOfWeek = targetDate.day();

    // We check if this day is NOT in the active shifts' working days
    // (Assuming all shifts share the same holidays/weekends for now, 
    // or we could check if a specific shift is working today)
    const isMorningWorking = settings.shifts.Morning.workingDays.includes(dayOfWeek);
    const isEveningWorking = settings.shifts.Evening.workingDays.includes(dayOfWeek);

    if (!isMorningWorking && !isEveningWorking) {
        return { isNonWorking: true, reason: "Weekend/Non-working Day", type: "Weekend" };
    }

    return { isNonWorking: false };
};

module.exports = calendarController;
