const mongoose = require("mongoose");

const TASK_STATUSES = ["Backlog", "In Progress", "Review", "Done"];
const TASK_PRIORITIES = ["Low", "Medium", "High"];

const TaskSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "Backlog",
    },
    // Position within its status column. Only ever used for sorting, so gaps
    // left behind by a card moving to another column are harmless.
    order: {
      type: Number,
      default: 0,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    dueDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "Medium",
    },
    // Cloudinary secure_urls, same as media/post attachments
    attachments: [{ type: String }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admin",
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Board reads are always "one project, grouped by column, in order"
TaskSchema.index({ project: 1, status: 1, order: 1 });

const Task = mongoose.model("task", TaskSchema);

Task.STATUSES = TASK_STATUSES;
Task.PRIORITIES = TASK_PRIORITIES;

module.exports = Task;
