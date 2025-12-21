const mongoose = require("mongoose");
const moment = require("moment-timezone");
const User = require("../models/user.model");
const Attendance = require("../models/attendance.model");
const AttendanceSettings = require("../models/attendance-settings.model");
require("dotenv").config({ path: ".env.development" });

// Connect to DB
const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://zeeshansd767:zeeshansd767@ims.tbja6ut.mongodb.net/?retryWrites=true&w=majority&appName=IMS");
        console.log("✅ MongoDB Connected");
    } catch (err) {
        console.error("❌ DB Connection Error:", err);
        process.exit(1);
    }
};

const runTest = async () => {
    await connectDB();

    try {
        console.log("🛠️ Preparing Test Data...");

        const timestamp = Date.now();

        // Create Test User 1: Working Days = [1] (Monday)
        const user1 = await User.create({
            name: `TestUser1_${timestamp}`,
            email: `test1_${timestamp}@example.com`,
            password: "password123",
            shift: "Morning",
            workingDays: [1], // Only Monday
            termsAccepted: true,
            course: "Web Development",
            incubation_id: `inc-test1-${timestamp}`,
            bq_id: `bq-test1-${timestamp}`,
            CNIC: `12345-${timestamp}-1`
        });

        // Create Test User 2: Working Days = [2] (Tuesday)
        const user2 = await User.create({
            name: `TestUser2_${timestamp}`,
            email: `test2_${timestamp}@example.com`,
            password: "password123",
            shift: "Morning",
            workingDays: [2], // Only Tuesday
            termsAccepted: true,
            course: "Web Development",
            incubation_id: `inc-test2-${timestamp}`,
            bq_id: `bq-test2-${timestamp}`,
            CNIC: `12345-${timestamp}-2`
        });

        console.log(`Created Users: ${user1.name} (Mon), ${user2.name} (Tue)`);

        // --- SIMULATE MONDAY (Day 1) ---
        console.log("\n--- Simulating MONDAY (Day 1) ---");
        const simulateDay = 1; // Monday

        // Logic from `jobs/attendance.job.js` adapted for test
        const users = [user1, user2];
        const settings = await AttendanceSettings.getSettings(); // Ensure settings exist

        for (const user of users) {
            let workingDays = user.workingDays;
            if (!workingDays || workingDays.length === 0) {
                if (user.shift && settings.shifts[user.shift]) {
                    workingDays = settings.shifts[user.shift].workingDays;
                }
            }
            if (!workingDays) workingDays = [1, 2, 3, 4, 5];

            console.log(`Checking User: ${user.name}, Working Days: ${workingDays}, Today: ${simulateDay}`);

            if (workingDays.includes(simulateDay)) {
                // Check if attendance exists (we know it doesn't for this test)
                console.log(`  -> marking ABSENT for ${user.name}`);
                await Attendance.create({
                    user: user._id,
                    shift: user.shift || "Morning",
                    status: "Absent",
                    hoursWorked: 0
                });
            } else {
                console.log(`  -> SKIPPING ${user.name} (Not a working day)`);
            }
        }

        // Verify Results
        const att1 = await Attendance.findOne({ user: user1._id, status: "Absent" });
        const att2 = await Attendance.findOne({ user: user2._id, status: "Absent" });

        console.log("\n--- Verification Results ---");
        if (att1) console.log("✅ User 1 (Mon) was marked Absent [CORRECT]");
        else console.error("❌ User 1 (Mon) was NOT marked Absent [FAILED]");

        if (!att2) console.log("✅ User 2 (Tue) was NOT marked Absent [CORRECT]");
        else console.error("❌ User 2 (Tue) WAS marked Absent [FAILED]");

        // Cleanup
        await User.deleteMany({ _id: { $in: [user1._id, user2._id] } });
        await Attendance.deleteMany({ _id: { $in: [att1?._id, att2?._id].filter(Boolean) } });
        console.log("\n🧹 Cleanup Done");

    } catch (err) {
        console.error("Test Failed:", err);
    } finally {
        await mongoose.disconnect();
    }
};

runTest();
