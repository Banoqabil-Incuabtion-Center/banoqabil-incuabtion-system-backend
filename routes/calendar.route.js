const express = require("express");
const router = express.Router();
const calendarController = require("../controllers/calendar.controller");
const { protect } = require("../middlewares/auth.middleware");

// All calendar routes require authentication
router.use(protect);

router.post("/", calendarController.createEntry);
router.get("/", calendarController.getEntries);
router.put("/:id", calendarController.updateEntry);
router.delete("/:id", calendarController.deleteEntry);

module.exports = router;
