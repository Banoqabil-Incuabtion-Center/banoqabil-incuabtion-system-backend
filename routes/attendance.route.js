const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendance.controller");
const validateObjectId = require("../middlewares/validate-object-id.middleware");
const { protect } = require("../middlewares/auth.middleware");

// User routes
router.post("/checkin/:_id", protect, attendanceController.checkin);
router.post("/checkout/:_id", protect, validateObjectId('_id'), attendanceController.checkout);
router.get("/status/:_id", protect, validateObjectId('_id'), attendanceController.getAttendanceStatus);
router.get("/status", protect, attendanceController.getAllUserStatus);
router.get("/shifts", protect, attendanceController.getShiftInfo);
router.get("/history", protect, attendanceController.getAttendanceHistory);
router.get("/history/:id", protect, validateObjectId('id'), attendanceController.getUserHistoryById);
router.get("/history/by-name/:name", protect, attendanceController.getUserHistoryByName);
router.get("/calendar/:id", protect, validateObjectId('id'), attendanceController.getUserHistoryForCalendar);

// Admin routes
router.get("/settings", protect, attendanceController.getSettings);
router.put("/settings", protect, attendanceController.updateSettings);
router.put("/update/:attendanceId", protect, validateObjectId('attendanceId'), attendanceController.updateAttendanceRecord);
router.delete("/delete/:attendanceId", protect, validateObjectId('attendanceId'), attendanceController.deleteAttendanceRecord);

// Debug routes
router.get("/check-ip", attendanceController.checkIP);

module.exports = router;