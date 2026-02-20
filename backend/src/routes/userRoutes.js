const express = require("express");
const {
  listUsers,
  getUserById,
  updateUser,
  countAdmins
} = require("../repositories/userRepository");
const {
  validateUserFilters,
  validateUserUpdatePayload,
  validateTaskFilters
} = require("../utils/validators");
const { requireAdmin } = require("../middleware/authMiddleware");
const { listTasks } = require("../repositories/taskRepository");

const router = express.Router();

router.use(requireAdmin);

router.get("/", async (req, res, next) => {
  try {
    const filters = validateUserFilters(req.query);
    const result = await listUsers(filters);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/tasks", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const filters = validateTaskFilters({
      ...req.query,
      assignedToUserId: userId
    });
    const result = await listTasks(filters, req.authUser);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const existing = await getUserById(userId);
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const validation = validateUserUpdatePayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.errors.join("; ") });
    }

    if (!Object.keys(validation.data).length) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    if (validation.data.role === "user" && existing.role === "admin") {
      const totalAdmins = await countAdmins();
      if (totalAdmins <= 1) {
        return res.status(400).json({ message: "At least one active admin is required" });
      }
    }

    if (validation.data.isActive === false && existing.role === "admin") {
      const totalAdmins = await countAdmins();
      if (totalAdmins <= 1) {
        return res.status(400).json({ message: "At least one active admin is required" });
      }
    }

    const updated = await updateUser(userId, validation.data);
    return res.json({ user: updated });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
