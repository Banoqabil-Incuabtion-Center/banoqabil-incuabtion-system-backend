const { z } = require("zod");

const STATUSES = ["Backlog", "In Progress", "Review", "Done"];
const PRIORITIES = ["Low", "Medium", "High"];

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const TaskSchema = z.object({
  project: objectId,
  title: z.string().min(3, "Title should be atleast of 3 characters"),
  description: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  assignees: z.array(objectId).optional(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(PRIORITIES).optional(),
  attachments: z.array(z.string()).optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(3, "Title should be atleast of 3 characters"),
  description: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  assignees: z.array(objectId).optional(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(PRIORITIES).optional(),
  attachments: z.array(z.string()).optional(),
});

// The board sends the destination column's full ordered id list after a drop,
// so the server never has to recompute indexes itself.
const MoveTaskSchema = z.object({
  status: z.enum(STATUSES),
  orderedIds: z.array(objectId).min(1, "orderedIds cannot be empty"),
});

module.exports = { TaskSchema, UpdateTaskSchema, MoveTaskSchema };
