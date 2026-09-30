const express = require("express");
const router = express.Router();
const userRoute = require("./user.route");
const adminRoute = require("./admin.route");
const attendanceRoute = require("./attendance.route")
const commentRoutes = require("./comment.route");
const mediaRoute = require("./media.route");
const pushRoute = require("./push.route");
const formBuilderRoute = require("./form-builder.route");

router.use("/api/user", userRoute);
router.use("/api/admin", adminRoute);
router.use("/api/attendance", attendanceRoute);
router.use("/api/form-builder", formBuilderRoute);
router.use('/api/comments', commentRoutes);
router.use('/api/media', mediaRoute);
router.use('/api/push', pushRoute);
router.use('/api/messages', require("./message.route"));
router.use('/api/calendar', require("./calendar.route"));
router.use('/api/studentRegistration', require("./studentRegistration.route.js"));

module.exports = router;
