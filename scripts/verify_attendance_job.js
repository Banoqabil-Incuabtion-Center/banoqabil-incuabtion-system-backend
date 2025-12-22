const fs = require("fs");
const dotenv = require("dotenv");
if (fs.existsSync(".env.development")) {
    dotenv.config({ path: ".env.development" });
} else {
    dotenv.config();
}
const mongoose = require("mongoose");
const connectDB = require("../config/db.config");
const { markAbsentJob } = require("../jobs/attendance.job");

const runVerify = async () => {
    await connectDB();
    console.log("--- Verifying Attendance Job Logic ---");

    // Run in dry run mode
    // Note: Since we are running this "Now" (e.g. Monday Afternoon),
    // The job will look at Yesterday (Sunday).
    // This confirms the "subtract 1 day" logic works.

    try {
        await markAbsentJob({ dryRun: true });
    } catch (e) {
        console.error("Job failed:", e);
    }

    process.exit();
};

runVerify();
