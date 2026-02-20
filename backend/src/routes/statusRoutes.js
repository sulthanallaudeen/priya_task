const express = require("express");
const {
  listStatuses,
  findStatusByName,
  getStatusById,
  createStatus,
  updateStatus,
  deleteStatus,
  countTasksUsingStatus
} = require("../repositories/statusRepository");
const { validateStatusPayload } = require("../utils/validators");
const { requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const statuses = await listStatuses();
    return res.json({ statuses });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const validation = validateStatusPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.errors.join("; ") });
    }

    const existing = await findStatusByName(validation.data.name);
    if (existing) {
      return res.status(409).json({ message: "Status name already exists" });
    }

    const status = await createStatus(validation.data.name);
    return res.status(201).json({ status });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const statusId = Number(req.params.id);
    if (!Number.isInteger(statusId) || statusId <= 0) {
      return res.status(400).json({ message: "Invalid status id" });
    }

    const validation = validateStatusPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.errors.join("; ") });
    }

    const existing = await getStatusById(statusId);
    if (!existing) {
      return res.status(404).json({ message: "Status not found" });
    }

    const duplicate = await findStatusByName(validation.data.name);
    if (duplicate && duplicate.id !== statusId) {
      return res.status(409).json({ message: "Status name already exists" });
    }

    const status = await updateStatus(statusId, validation.data.name);
    return res.json({ status });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const statusId = Number(req.params.id);
    if (!Number.isInteger(statusId) || statusId <= 0) {
      return res.status(400).json({ message: "Invalid status id" });
    }

    const existing = await getStatusById(statusId);
    if (!existing) {
      return res.status(404).json({ message: "Status not found" });
    }

    const usageCount = await countTasksUsingStatus(statusId);
    if (usageCount > 0) {
      return res
        .status(400)
        .json({ message: "Status is assigned to tasks and cannot be deleted" });
    }

    await deleteStatus(statusId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
