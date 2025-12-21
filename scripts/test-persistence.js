require("dotenv").config();
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const User = require("../models/user.model");
const Att = require("../models/attendance.model");
const attendanceController = require("../controllers/attendance.controller");

// Mock Express req, res, next
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

const runTest = async () => {
    try {
        console.log("🚀 Starting Persistence Logic Test...");

        // Connect DB
        const dbURI = "mongodb+srv://zeeshansd767:zeeshansd767@ims.tbja6ut.mongodb.net/?retryWrites=true&w=majority&appName=IMS";
        await mongoose.connect(dbURI);
        console.log("✅ DB Connected");

        // 1. Create Test User
        const testEmail = `persist_user_${Date.now()}@test.com`;
        const user = await User.create({
            name: "Persistence User",
            email: testEmail,
            password: "password123",
            termsAccepted: true,
            bq_id: `BQ-${Date.now()}`,
            CNIC: `CNIC-${Date.now()}`,
            incubation_id: `inc-${Date.now()}`,
            shift: "Morning",
            workingDays: [0, 1, 2, 3, 4, 5, 6] // Works every day
        });
        console.log(`✅ Created User: ${user.email} (${user._id})`);

        // Helper to check stats
        const checkStats = async (expectedPresent, expectedTotalHours) => {
            const u = await User.findById(user._id);
            console.log(`📊 Stats Check: Present=${u.attendanceStats.present}, TotalHours=${u.attendanceStats.totalHours}`);

            if (u.attendanceStats.present !== expectedPresent) {
                console.error(`❌ FAILED: Expected Present=${expectedPresent}, got ${u.attendanceStats.present}`);
            } else {
                console.log(`✅ Present Count Correct (${expectedPresent})`);
            }

            // Approximate float check
            if (Math.abs(u.attendanceStats.totalHours - expectedTotalHours) > 0.1) {
                console.error(`❌ FAILED: Expected Hours approx ${expectedTotalHours}, got ${u.attendanceStats.totalHours}`);
            } else {
                console.log(`✅ Total Hours Correct (${u.attendanceStats.totalHours})`);
            }
        };

        // 2. Simulate Check-in & Check-out (SHORT DURATION < 4 hours)
        // Check in at 9 AM, Check out at 11 AM (2 hours)
        console.log("\n🧪 Test Case 1: Short Duration (< 4 hours)");

        // Simulate checkin
        // We need to verify checkin actually creates the record
        // We will bypass controller and do manual create to save time/complexity mocking requests fully, 
        // OR just use controller logic if possible. Controller is tied to "Now". 
        // Let's modify record manually to simulate past checkin, then call checkout controller.

        // Manual Checkin (9 AM today)
        const today = moment().tz("Asia/Karachi");
        const checkInTime = today.clone().hour(9).minute(0).toDate();

        const att1 = await Att.create({
            user: user._id,
            shift: "Morning",
            checkInTime: checkInTime,
            status: "Present",
            hoursWorked: 0
        });

        // Check out at 11 AM (Mocking "Now" is hard for controller without dependency injection)
        // We will update the 'checkout' controller to accept a "now" for testing? No, too invasive.
        // Instead, let's just manually run the logic snippet we added or invoke controller if we can fake "Date.now()" but we can't easily.
        // Let's just USE THE CONTROLLER but we have to accept that "checkout" uses actual current time.
        // So if I check in "now", I have to wait 4 hours? That's impossible.
        // Hack: I will create a check-in record that was 5 hours ago. Then checkout NOW.

        // Case 1: Short attendance. 
        // Check-in was 2 hours ago.
        const twoHoursAgo = today.clone().subtract(2, 'hours').toDate();
        const attShort = await Att.create({
            user: user._id,
            shift: "Morning",
            checkInTime: twoHoursAgo,
            status: "Present",
            hoursWorked: 0
        });

        // Now checkout
        console.log("Checking out (approx 2 hours worked)...");
        const req1 = { params: { _id: user._id.toString() }, headers: {}, connection: {} };
        const res1 = mockRes();
        const next1 = (err) => console.error(err);

        await attendanceController.checkout(req1, res1, next1);

        if (res1.statusCode && res1.statusCode !== 200) {
            console.error("Checkout failed:", res1.data);
        } else {
            console.log("Checkout complete.");
        }

        // Verify: Present should be 0 (because < 4 hours), Hours approx 2.
        await checkStats(0, 2);


        // Case 2: Long attendance (> 4 hours).
        // Check-in was 5 hours ago.
        const fiveHoursAgo = today.clone().subtract(5, 'hours').toDate();
        // Use a different day to avoid "Already checked in" or shift confusion? 
        // Controller checks "active check-in found for today". 
        // Since we just checked out one record for "today", we need another open one.
        // But duplicate check-ins might be an issue if logic checks "startOfDay".
        // Let's delete previous att record or just update it to be yesterday.
        await Att.deleteMany({ user: user._id });

        const attLong = await Att.create({
            user: user._id,
            shift: "Morning",
            checkInTime: fiveHoursAgo,
            status: "Present",
            hoursWorked: 0
        });

        console.log("\n🧪 Test Case 2: Long Duration (> 4 hours)");
        console.log("Checking out (approx 5 hours worked)...");

        const req2 = { params: { _id: user._id.toString() }, headers: {}, connection: {} };
        const res2 = mockRes();

        await attendanceController.checkout(req2, res2, next1);
        if (res2.statusCode && res2.statusCode !== 200) console.error(res2.data);

        // Verify: Present should be 1 (incremented), Total Hours approx 2 + 5 = 7.
        await checkStats(1, 7);

        console.log("\n✅ Test Complete. Cleaning up...");
        await User.findByIdAndDelete(user._id);
        await Att.deleteMany({ user: user._id });
        process.exit(0);

    } catch (err) {
        console.error("❌ Test Error:", err);
        process.exit(1);
    }
};

runTest();
