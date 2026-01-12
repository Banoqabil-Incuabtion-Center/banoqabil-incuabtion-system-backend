const express = require("express");
const router = express.Router();
const calendarController = require("../controllers/calendar.controller");
const { protect } = require("../middlewares/auth.middleware");

// All calendar routes require authentication
router.use(protect);

// Calendar settings (working days)
router.get("/settings", calendarController.getSettings);
router.put("/settings", calendarController.updateSettings);

// Seed sample events
router.post("/seed", calendarController.seedJanuaryEvents);

// Calendar entries CRUD
router.post("/", calendarController.createEntry);
router.get("/", calendarController.getEntries);
router.put("/:id", calendarController.updateEntry);
router.delete("/:id", calendarController.deleteEntry);

module.exports = router;

