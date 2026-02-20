const { pool } = require("../config/db");

function mapTaskRecord(record) {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    priority: record.priority,
    dueDate: record.due_date,
    statusId: record.status_id,
    statusName: record.status_name,
    assignedToUserId: record.assigned_to_user_id,
    assignedToUserName: record.assigned_to_user_name,
    createdByUserId: record.created_by_user_id,
    createdByUserName: record.created_by_user_name,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function buildTaskWhereClause(filters, actor) {
  const whereClauses = [];
  const values = [];

  if (actor.role !== "admin") {
    whereClauses.push("t.assigned_to_user_id = ?");
    values.push(actor.id);
  } else if (filters.assignedToUserId) {
    whereClauses.push("t.assigned_to_user_id = ?");
    values.push(filters.assignedToUserId);
  }

  if (filters.statusId) {
    whereClauses.push("t.status_id = ?");
    values.push(filters.statusId);
  }

  if (filters.priority) {
    whereClauses.push("t.priority = ?");
    values.push(filters.priority);
  }

  if (filters.search) {
    whereClauses.push("(t.title LIKE ? OR t.description LIKE ?)");
    values.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  return { whereSql, values };
}

async function listTasks(filters, actor) {
  const { whereSql, values } = buildTaskWhereClause(filters, actor);
  const offset = (filters.page - 1) * filters.limit;

  const [rows] = await pool.query(
    `
      SELECT
        t.id,
        t.title,
        t.description,
        t.priority,
        t.due_date,
        t.status_id,
        s.name AS status_name,
        t.assigned_to_user_id,
        assignee.full_name AS assigned_to_user_name,
        t.created_by_user_id,
        creator.full_name AS created_by_user_name,
        t.created_at,
        t.updated_at
      FROM tasks t
      INNER JOIN task_statuses s ON s.id = t.status_id
      INNER JOIN users assignee ON assignee.id = t.assigned_to_user_id
      INNER JOIN users creator ON creator.id = t.created_by_user_id
      ${whereSql}
      ORDER BY ${filters.sortBy} ${filters.order}
      LIMIT ? OFFSET ?
    `,
    [...values, filters.limit, offset]
  );

  const [countRows] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM tasks t
      ${whereSql}
    `,
    values
  );

  return {
    tasks: rows.map(mapTaskRecord),
    total: Number(countRows[0].total),
    page: filters.page,
    limit: filters.limit
  };
}

async function getTaskById(taskId) {
  const [rows] = await pool.query(
    `
      SELECT
        t.id,
        t.title,
        t.description,
        t.priority,
        t.due_date,
        t.status_id,
        s.name AS status_name,
        t.assigned_to_user_id,
        assignee.full_name AS assigned_to_user_name,
        t.created_by_user_id,
        creator.full_name AS created_by_user_name,
        t.created_at,
        t.updated_at
      FROM tasks t
      INNER JOIN task_statuses s ON s.id = t.status_id
      INNER JOIN users assignee ON assignee.id = t.assigned_to_user_id
      INNER JOIN users creator ON creator.id = t.created_by_user_id
      WHERE t.id = ?
      LIMIT 1
    `,
    [taskId]
  );

  return rows.length ? mapTaskRecord(rows[0]) : null;
}

async function createTask(task) {
  const [result] = await pool.query(
    `
      INSERT INTO tasks (
        title,
        description,
        priority,
        due_date,
        status_id,
        assigned_to_user_id,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      task.title,
      task.description,
      task.priority,
      task.dueDate,
      task.statusId,
      task.assignedToUserId,
      task.createdByUserId
    ]
  );

  return getTaskById(result.insertId);
}

async function updateTask(taskId, task) {
  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(task, "title")) {
    fields.push("title = ?");
    values.push(task.title);
  }
  if (Object.prototype.hasOwnProperty.call(task, "description")) {
    fields.push("description = ?");
    values.push(task.description);
  }
  if (Object.prototype.hasOwnProperty.call(task, "priority")) {
    fields.push("priority = ?");
    values.push(task.priority);
  }
  if (Object.prototype.hasOwnProperty.call(task, "dueDate")) {
    fields.push("due_date = ?");
    values.push(task.dueDate);
  }
  if (Object.prototype.hasOwnProperty.call(task, "statusId")) {
    fields.push("status_id = ?");
    values.push(task.statusId);
  }
  if (Object.prototype.hasOwnProperty.call(task, "assignedToUserId")) {
    fields.push("assigned_to_user_id = ?");
    values.push(task.assignedToUserId);
  }

  if (!fields.length) {
    return getTaskById(taskId);
  }

  values.push(taskId);
  await pool.query(
    `
      UPDATE tasks
      SET ${fields.join(", ")}
      WHERE id = ?
    `,
    values
  );

  return getTaskById(taskId);
}

async function deleteTask(taskId) {
  const [result] = await pool.query("DELETE FROM tasks WHERE id = ?", [taskId]);
  return result.affectedRows > 0;
}

module.exports = {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask
};
