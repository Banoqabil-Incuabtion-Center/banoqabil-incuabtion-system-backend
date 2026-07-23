const Task = require("../models/task.model");
const Project = require("../models/project.model");
const { emitToProject } = require("../socket");

const TaskController = {};

const ASSIGNEE_FIELDS = "name avatar incubation_id";

// Shape a task for the board: assignees populated, nothing else.
const populateTask = (query) => query.populate({ path: "assignees", select: ASSIGNEE_FIELDS });

/**
 * GET /api/admin/task/board/:projectId
 * Returns every non-deleted task of a project already grouped into its columns,
 * so the board can render without doing the grouping itself.
 */
TaskController.getBoard = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({ _id: projectId, deletedAt: null })
      .populate({ path: "teamName", select: "teamName" })
      .populate({ path: "PM", select: "name" });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const tasks = await populateTask(
      Task.find({ project: projectId, deletedAt: null }).sort({ order: 1, createdAt: 1 })
    );

    const columns = Task.STATUSES.map((status) => ({
      status,
      tasks: tasks.filter((task) => task.status === status),
    }));

    res.status(200).json({ project, columns });
  } catch (error) {
    console.error("Error Fetching Board:", error);
    res.status(500).json({ message: "Error Fetching Board", error });
  }
};

/**
 * POST /api/admin/task
 * New cards land at the bottom of their column.
 */
TaskController.createTask = async (req, res) => {
  try {
    const { project, title, description, status, assignees, dueDate, priority, attachments } =
      req.validatedData;

    const projectExists = await Project.exists({ _id: project, deletedAt: null });
    if (!projectExists) {
      return res.status(404).json({ message: "Project not found" });
    }

    const column = status || "Backlog";
    const countInColumn = await Task.countDocuments({
      project,
      status: column,
      deletedAt: null,
    });

    const created = await Task.create({
      project,
      title,
      description: description || "",
      status: column,
      order: countInColumn,
      assignees: assignees || [],
      dueDate: dueDate || null,
      priority: priority || "Medium",
      attachments: attachments || [],
      createdBy: req.user?.id || null,
    });

    const task = await populateTask(Task.findById(created._id));

    emitToProject(project, "task:created", { task });

    return res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

/**
 * PUT /api/admin/task/:id
 * Edits card content. Column position is owned by moveTask, not this.
 */
TaskController.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, assignees, dueDate, priority, attachments } =
      req.validatedData;

    const existing = await Task.findOne({ _id: id, deletedAt: null });
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    const update = {
      title,
      description: description || "",
      assignees: assignees || [],
      dueDate: dueDate || null,
      priority: priority || "Medium",
      attachments: attachments || [],
    };

    // Changing status here (rather than by dragging) drops the card at the
    // bottom of the target column.
    if (status && status !== existing.status) {
      update.status = status;
      update.order = await Task.countDocuments({
        project: existing.project,
        status,
        deletedAt: null,
      });
    }

    await Task.findByIdAndUpdate(id, update);
    const task = await populateTask(Task.findById(id));

    emitToProject(existing.project, "task:updated", { task });

    res.status(200).json({ message: "Task updated successfully", task });
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

/**
 * PATCH /api/admin/task/:id/move
 * The board sends the destination column's full ordered id list after the drop,
 * so ordering is a straight write of index -> order with no server-side index
 * math. The source column is left with a gap, which is fine: order is only ever
 * used as a sort key.
 */
TaskController.moveTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, orderedIds } = req.validatedData;

    const task = await Task.findOne({ _id: id, deletedAt: null });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!orderedIds.includes(id)) {
      return res.status(400).json({ message: "orderedIds must contain the moved task" });
    }

    // Never let one project's payload renumber another project's cards.
    const siblingCount = await Task.countDocuments({
      _id: { $in: orderedIds },
      project: task.project,
      deletedAt: null,
    });
    if (siblingCount !== orderedIds.length) {
      return res.status(400).json({
        message: "orderedIds must all belong to the same project as the moved task",
      });
    }

    // Every id in the list belongs to the destination column, so writing the
    // same status to all of them is correct and idempotent — only the dragged
    // card is actually changing it.
    await Task.bulkWrite(
      orderedIds.map((taskId, index) => ({
        updateOne: {
          filter: { _id: taskId, project: task.project, deletedAt: null },
          update: { $set: { status, order: index } },
        },
      }))
    );

    const moved = await populateTask(Task.findById(id));

    emitToProject(task.project, "task:moved", {
      task: moved,
      status,
      orderedIds,
      from: task.status,
    });

    res.status(200).json({ message: "Task moved successfully", task: moved });
  } catch (error) {
    console.error("Error moving task:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

/**
 * DELETE /api/admin/task/:id — soft delete, matching every other model here.
 */
TaskController.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Task.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ message: "Task not found" });
    }

    emitToProject(deleted.project, "task:deleted", { taskId: id });

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { TaskController };
