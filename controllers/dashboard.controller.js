const User = require("../models/user.model");
const PM = require("../models/pm.model");
const Team = require("../models/team.model");
const Project = require("../models/project.model");
const Attendance = require("../models/attendance.model");

const dashboardController = {};

dashboardController.getStats = async (req, res) => {
  try {
    // --- Core counts (exclude soft-deleted) ---
    const [totalStudents, totalPMs, totalTeams, totalProjects] =
      await Promise.all([
        User.countDocuments({ deletedAt: null }),
        PM.countDocuments({ deletedAt: null }),
        Team.countDocuments({ deletedAt: null }),
        Project.countDocuments({ deletedAt: null }),
      ]);

    // --- Today's attendance rate ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayRecords = await Attendance.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      deletedAt: null,
    });

    const todayPresent = await Attendance.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ["Present", "Late"] },
      deletedAt: null,
    });

    const todayAttendanceRate =
      totalStudents > 0
        ? Math.round((todayPresent / totalStudents) * 100)
        : 0;

    // --- Students by course ---
    const courseDistribution = await User.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$course", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // --- Attendance trend (last 30 days) ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const attendanceTrend = await Attendance.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          present: {
            $sum: {
              $cond: [{ $in: ["$status", ["Present"]] }, 1, 0],
            },
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ["$status", "Absent"] }, 1, 0],
            },
          },
          late: {
            $sum: {
              $cond: [{ $eq: ["$status", "Late"] }, 1, 0],
            },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id.date",
          present: 1,
          absent: 1,
          late: 1,
          total: 1,
        },
      },
    ]);

    // --- Students by gender ---
    const genderDistribution = await User.aggregate([
      { $match: { deletedAt: null, gender: { $ne: null } } },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);

    // --- Students by shift ---
    const shiftDistribution = await User.aggregate([
      { $match: { deletedAt: null, shift: { $ne: null } } },
      { $group: { _id: "$shift", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      totalStudents,
      totalPMs,
      totalTeams,
      totalProjects,
      todayAttendance: {
        total: todayRecords,
        present: todayPresent,
        rate: todayAttendanceRate,
      },
      courseDistribution: courseDistribution.map((c) => ({
        course: c._id || "Unknown",
        count: c.count,
      })),
      genderDistribution: genderDistribution.map((g) => ({
        gender: g._id,
        count: g.count,
      })),
      shiftDistribution: shiftDistribution.map((s) => ({
        shift: s._id,
        count: s.count,
      })),
      attendanceTrend,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};

module.exports = dashboardController;
