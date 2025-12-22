const fs = require("fs");
const dotenv = require("dotenv");
if (fs.existsSync(".env.development")) {
    dotenv.config({ path: ".env.development" });
} else {
    dotenv.config(); // Fallback
}
const mongoose = require("mongoose");
const connectDB = require("../config/db.config");
const Attendance = require("../models/attendance.model");
const User = require("../models/user.model");
const moment = require("moment-timezone");

const run = async () => {
    await connectDB();

    console.log("--- Debugging Attendance Records ---");
    const now = moment().tz("Asia/Karachi");
    console.log(`Current Time (PKT): ${now.format("YYYY-MM-DD HH:mm:ss")}`);

    // Check for Absent records created in the last 24 hours
    const last24Hours = moment().subtract(24, "hours").toDate();

    const absentRecords = await Attendance.find({
        createdAt: { $gte: last24Hours },
        status: "Absent"
    }).populate("user", "name email");

    console.log(`Found ${absentRecords.length} 'Absent' records in the last 24 hours.`);

    if (absentRecords.length > 0) {
        console.log("Sample Records:");
        absentRecords.slice(0, 5).forEach(att => {
            const createdPKT = moment(att.createdAt).tz("Asia/Karachi").format("YYYY-MM-DD HH:mm:ss");
            console.log(`- User: ${att.user?.name}, CreatedAt: ${createdPKT}, Shift: ${att.shift}`);
        });

        // Group by creation hour to see when the job ran
        const histogram = {};
        absentRecords.forEach(att => {
            const hour = moment(att.createdAt).tz("Asia/Karachi").format("YYYY-MM-DD HH");
            histogram[hour] = (histogram[hour] || 0) + 1;
        });
        console.log("Creation Time Histogram (PKT):", histogram);
    }

    process.exit();
};

run();
