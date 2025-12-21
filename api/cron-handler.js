const { markAbsentJob } = require("../jobs/attendance.job");
const connectDB = require("../config/db.config");

module.exports = async (req, res) => {
    // 1. Security check (Optional but recommended)
    // If you set a CRON_SECRET in Vercel environment variables, uncomment this:
    /*
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    */

    try {
        // 2. Connect to Database
        await connectDB();

        // 3. Run the Job
        const dryRun = req.query.dryRun === "true";
        console.log(`🚀 Starting Attendance Cron Job via Vercel Function... ${dryRun ? "(DRY RUN)" : ""}`);
        const result = await markAbsentJob({ dryRun });

        // 4. Return response
        return res.status(200).json({
            success: true,
            message: "Attendance job completed successfully",
            data: result,
        });
    } catch (error) {
        console.error("❌ Cron Job Error:", error);
        return res.status(500).json({
            success: false,
            message: "Cron job failed",
            error: error.message,
        });
    }
};
