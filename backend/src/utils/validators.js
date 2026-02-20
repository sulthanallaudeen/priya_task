const VALID_PRIORITIES = ["low", "medium", "high"];
const VALID_ROLES = ["admin", "user"];

function sanitizeText(value) {
  if (typeof value !== "string") {
    return value;
  }
  return value.trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function validateRegisterPayload(payload) {
  const errors = [];
  const normalized = {};

  const fullName = sanitizeText(payload.fullName);
  if (!fullName || fullName.length < 2 || fullName.length > 120) {
    errors.push("fullName must be between 2 and 120 characters");
  } else {
    normalized.fullName = fullName;
  }

  const email = sanitizeText(payload.email).toLowerCase();
  if (!isValidEmail(email)) {
    errors.push("email must be a valid email address");
  } else {
    normalized.email = email;
  }

  const password = String(payload.password || "");
  if (password.length < 8 || password.length > 120) {
    errors.push("password must be between 8 and 120 characters");
  } else {
    normalized.password = password;
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: normalized
  };
}

function validateLoginPayload(payload) {
  const errors = [];
  const normalized = {};

  const email = sanitizeText(payload.email).toLowerCase();
  if (!isValidEmail(email)) {
    errors.push("email must be a valid email address");
  } else {
    normalized.email = email;
  }

  const password = String(payload.password || "");
  if (!password) {
    errors.push("password is required");
  } else {
    normalized.password = password;
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: normalized
  };
}

function validateTaskPayload(payload, options = { partial: false }) {
  const errors = [];
  const partial = Boolean(options.partial);
  const normalized = {};

  if (!partial || Object.prototype.hasOwnProperty.call(payload, "title")) {
    const title = sanitizeText(payload.title);
    if (!title || typeof title !== "string") {
      errors.push("title is required and must be a non-empty string");
    } else if (title.length > 120) {
      errors.push("title must be at most 120 characters");
    } else {
      normalized.title = title;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "description")) {
    if (payload.description === null || payload.description === undefined) {
      normalized.description = null;
    } else if (typeof payload.description !== "string") {
      errors.push("description must be a string or null");
    } else if (payload.description.length > 2000) {
      errors.push("description must be at most 2000 characters");
    } else {
      normalized.description = payload.description.trim() || null;
    }
  } else if (!partial) {
    normalized.description = null;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, "priority")) {
    const priority = sanitizeText(payload.priority || "medium");
    if (!VALID_PRIORITIES.includes(priority)) {
      errors.push(`priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
    } else {
      normalized.priority = priority;
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, "statusId")) {
    const statusId = Number(payload.statusId);
    if (!Number.isInteger(statusId) || statusId <= 0) {
      errors.push("statusId must be a valid positive integer");
    } else {
      normalized.statusId = statusId;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "assignedToUserId")) {
    const assignedToUserId = Number(payload.assignedToUserId);
    if (!Number.isInteger(assignedToUserId) || assignedToUserId <= 0) {
      errors.push("assignedToUserId must be a valid positive integer");
    } else {
      normalized.assignedToUserId = assignedToUserId;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "dueDate")) {
    if (payload.dueDate === null || payload.dueDate === "") {
      normalized.dueDate = null;
    } else if (
      typeof payload.dueDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(payload.dueDate)
    ) {
      normalized.dueDate = payload.dueDate;
    } else {
      errors.push("dueDate must be null or a valid date in YYYY-MM-DD format");
    }
  } else if (!partial) {
    normalized.dueDate = null;
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: normalized
  };
}

function validateStatusPayload(payload) {
  const errors = [];
  const name = sanitizeText(payload.name);
  if (!name || name.length < 2 || name.length > 40) {
    errors.push("name must be between 2 and 40 characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: { name }
  };
}

function validateTaskFilters(filters) {
  const result = {
    search: undefined,
    statusId: undefined,
    priority: undefined,
    assignedToUserId: undefined,
    sortBy: "t.created_at",
    order: "DESC",
    page: 1,
    limit: 5
  };

  if (typeof filters.q === "string" && filters.q.trim()) {
    result.search = filters.q.trim();
  }

  if (filters.statusId) {
    const statusId = Number(filters.statusId);
    if (Number.isInteger(statusId) && statusId > 0) {
      result.statusId = statusId;
    }
  }

  if (filters.priority && VALID_PRIORITIES.includes(filters.priority)) {
    result.priority = filters.priority;
  }

  if (filters.assignedToUserId) {
    const assignedToUserId = Number(filters.assignedToUserId);
    if (Number.isInteger(assignedToUserId) && assignedToUserId > 0) {
      result.assignedToUserId = assignedToUserId;
    }
  }

  const allowedSortColumns = {
    createdAt: "t.created_at",
    dueDate: "t.due_date",
    title: "t.title",
    priority: "t.priority"
  };
  if (filters.sortBy && allowedSortColumns[filters.sortBy]) {
    result.sortBy = allowedSortColumns[filters.sortBy];
  }

  if (filters.order && String(filters.order).toUpperCase() === "ASC") {
    result.order = "ASC";
  }

  const page = Number(filters.page);
  if (Number.isInteger(page) && page > 0) {
    result.page = page;
  }

  const limit = Number(filters.limit);
  if (Number.isInteger(limit) && limit > 0 && limit <= 50) {
    result.limit = limit;
  }

  return result;
}

function validateUserFilters(filters) {
  const result = {
    search: undefined,
    page: 1,
    limit: 10
  };

  if (typeof filters.q === "string" && filters.q.trim()) {
    result.search = filters.q.trim();
  }

  const page = Number(filters.page);
  if (Number.isInteger(page) && page > 0) {
    result.page = page;
  }

  const limit = Number(filters.limit);
  if (Number.isInteger(limit) && limit > 0 && limit <= 50) {
    result.limit = limit;
  }

  return result;
}

function validateUserUpdatePayload(payload) {
  const errors = [];
  const normalized = {};

  if (Object.prototype.hasOwnProperty.call(payload, "role")) {
    const role = sanitizeText(payload.role);
    if (!VALID_ROLES.includes(role)) {
      errors.push(`role must be one of: ${VALID_ROLES.join(", ")}`);
    } else {
      normalized.role = role;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "isActive")) {
    normalized.isActive = Boolean(payload.isActive);
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: normalized
  };
}

module.exports = {
  VALID_PRIORITIES,
  VALID_ROLES,
  validateRegisterPayload,
  validateLoginPayload,
  validateTaskPayload,
  validateStatusPayload,
  validateTaskFilters,
  validateUserFilters,
  validateUserUpdatePayload
};
