const mongoose = require("mongoose");
const { markAbsentJob } = require("../jobs/attendance.job");
const AttendanceSettings = require("../models/attendance-settings.model");
const path = require("path");
const dotenv = require("dotenv");

// Load env
const envFile = path.resolve(__dirname, "../.env.development");
dotenv.config({ path: envFile });

const runTest = async () => {
    try {
        await require("../config/db.config")();

        console.log("🚀 Starting Attendance Lock Test...");

        // 1. Reset the lock for today (to ensure test starts clean)
        const settings = await AttendanceSettings.getSettings();
        // manually set lastAutomatedRunDate to null or a past date
        await AttendanceSettings.findByIdAndUpdate(settings._id, { lastAutomatedRunDate: "1970-01-01" });
        console.log("✅ Reset lastAutomatedRunDate for testing.");

        // 2. Run Job First Time
        console.log("\n▶️ Running Job Iteration 1 (Should Succeed)...");
        const result1 = await markAbsentJob({ dryRun: false });
        console.log("Result 1:", result1);

        if (result1.skipped) {
            console.error("❌ Test Failed: First run should not have been skipped.");
            process.exit(1);
        }

        // 3. Run Job Second Time
        console.log("\n▶️ Running Job Iteration 2 (Should Skip)...");
        const result2 = await markAbsentJob({ dryRun: false });
        console.log("Result 2:", result2);

        if (!result2.skipped) {
            console.error("❌ Test Failed: Second run should have been skipped.");
            process.exit(1);
        }

        console.log("\n✅ Test Passed: Locking mechanism is working.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Test Error:", error);
        process.exit(1);
    }
};

runTest();
