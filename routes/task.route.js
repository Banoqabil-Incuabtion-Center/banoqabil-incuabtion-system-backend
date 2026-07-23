const express = require("express");
const router = express.Router();
const { TaskController } = require("../controllers/task.controller");
const { protect } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/form-validator.middleware");
const validateObjectId = require("../middlewares/validate-object-id.middleware");
const {
  TaskSchema,
  UpdateTaskSchema,
  MoveTaskSchema,
} = require("../validators/task.validation");

router.use(protect);

router.get("/board/:projectId", validateObjectId("projectId"), TaskController.getBoard);

router.post("/", validate(TaskSchema), TaskController.createTask);

router.put("/:id", validateObjectId("id"), validate(UpdateTaskSchema), TaskController.updateTask);

router.patch("/:id/move", validateObjectId("id"), validate(MoveTaskSchema), TaskController.moveTask);

router.delete("/:id", validateObjectId("id"), TaskController.deleteTask);

module.exports = router;
