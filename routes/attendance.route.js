const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendance.controller");
const validateObjectId = require("../middlewares/validate-object-id.middleware");
const { protect } = require("../middlewares/auth.middleware");

// User routes
router.post("/checkin/:_id", protect, attendanceController.checkin);
router.post("/checkout/:_id", protect, validateObjectId('_id'), attendanceController.checkout);
router.get("/status/:_id", protect, validateObjectId('_id'), attendanceController.getAttendanceStatus);
router.get("/status", attendanceController.getAllUserStatus);
router.get("/shifts", attendanceController.getShiftInfo);
router.get("/history", attendanceController.getAttendanceHistory);
router.get("/history/:id", protect, validateObjectId('id'), attendanceController.getUserHistoryById);
router.get("/history/by-name/:name", attendanceController.getUserHistoryByName);
router.get("/calendar/:id", protect, validateObjectId('id'), attendanceController.getUserHistoryForCalendar);

// Admin routes
router.get("/settings", attendanceController.getSettings);
router.put("/settings", attendanceController.updateSettings);
router.put("/update/:attendanceId", validateObjectId('attendanceId'), attendanceController.updateAttendanceRecord);
router.delete("/delete/:attendanceId", validateObjectId('attendanceId'), attendanceController.deleteAttendanceRecord);

module.exports = router;