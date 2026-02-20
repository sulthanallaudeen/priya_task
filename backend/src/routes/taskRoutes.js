const express = require("express");
const {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask
} = require("../repositories/taskRepository");
const { getUserById } = require("../repositories/userRepository");
const { getStatusById, getDefaultStatusId } = require("../repositories/statusRepository");
const { validateTaskPayload, validateTaskFilters } = require("../utils/validators");

const router = express.Router();

function canAccessTask(actor, task) {
  if (actor.role === "admin") {
    return true;
  }
  return task.assignedToUserId === actor.id;
}

router.get("/", async (req, res, next) => {
  try {
    const filters = validateTaskFilters(req.query);
    const result = await listTasks(filters, req.authUser);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!canAccessTask(req.authUser, task)) {
      return res.status(403).json({ message: "You do not have access to this task" });
    }

    return res.json({ task });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (!payload.statusId) {
      payload.statusId = await getDefaultStatusId();
    }

    const validation = validateTaskPayload(payload, { partial: false });
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.errors.join("; ") });
    }

    const assigneeId = validation.data.assignedToUserId || req.authUser.id;
    if (req.authUser.role !== "admin" && assigneeId !== req.authUser.id) {
      return res
        .status(403)
        .json({ message: "You can only assign tasks to yourself as a non-admin user" });
    }

    const assignee = await getUserById(assigneeId);
    if (!assignee || !assignee.isActive) {
      return res.status(400).json({ message: "Assigned user is invalid or inactive" });
    }

    const status = await getStatusById(validation.data.statusId);
    if (!status) {
      return res.status(400).json({ message: "statusId does not exist" });
    }

    const task = await createTask({
      ...validation.data,
      assignedToUserId: assigneeId,
      createdByUserId: req.authUser.id
    });

    return res.status(201).json({ task });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const existing = await getTaskById(taskId);
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!canAccessTask(req.authUser, existing)) {
      return res.status(403).json({ message: "You do not have permission to update this task" });
    }

    const validation = validateTaskPayload(req.body, { partial: true });
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.errors.join("; ") });
    }

    const updates = { ...validation.data };
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "statusId")) {
      const status = await getStatusById(updates.statusId);
      if (!status) {
        return res.status(400).json({ message: "statusId does not exist" });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "assignedToUserId")) {
      if (req.authUser.role !== "admin" && updates.assignedToUserId !== req.authUser.id) {
        return res
          .status(403)
          .json({ message: "You can only assign tasks to yourself as a non-admin user" });
      }

      const assignee = await getUserById(updates.assignedToUserId);
      if (!assignee || !assignee.isActive) {
        return res.status(400).json({ message: "Assigned user is invalid or inactive" });
      }
    }

    const task = await updateTask(taskId, updates);
    return res.json({ task });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const existing = await getTaskById(taskId);
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!canAccessTask(req.authUser, existing)) {
      return res.status(403).json({ message: "You do not have permission to delete this task" });
    }

    await deleteTask(taskId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
