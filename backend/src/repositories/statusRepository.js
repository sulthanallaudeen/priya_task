const { pool } = require("../config/db");

function mapStatusRecord(record) {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

async function listStatuses() {
  const [rows] = await pool.query(
    `
      SELECT id, name, created_at, updated_at
      FROM task_statuses
      ORDER BY id ASC
    `
  );
  return rows.map(mapStatusRecord);
}

async function getStatusById(statusId) {
  const [rows] = await pool.query(
    `
      SELECT id, name, created_at, updated_at
      FROM task_statuses
      WHERE id = ?
      LIMIT 1
    `,
    [statusId]
  );
  return rows.length ? mapStatusRecord(rows[0]) : null;
}

async function findStatusByName(name) {
  const [rows] = await pool.query(
    `
      SELECT id, name, created_at, updated_at
      FROM task_statuses
      WHERE LOWER(name) = LOWER(?)
      LIMIT 1
    `,
    [name]
  );
  return rows.length ? mapStatusRecord(rows[0]) : null;
}

async function createStatus(name) {
  const [result] = await pool.query(
    `
      INSERT INTO task_statuses (name)
      VALUES (?)
    `,
    [name]
  );
  return getStatusById(result.insertId);
}

async function updateStatus(statusId, name) {
  await pool.query(
    `
      UPDATE task_statuses
      SET name = ?
      WHERE id = ?
    `,
    [name, statusId]
  );
  return getStatusById(statusId);
}

async function deleteStatus(statusId) {
  const [result] = await pool.query("DELETE FROM task_statuses WHERE id = ?", [statusId]);
  return result.affectedRows > 0;
}

async function countTasksUsingStatus(statusId) {
  const [rows] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM tasks
      WHERE status_id = ?
    `,
    [statusId]
  );
  return Number(rows[0].total);
}

async function getDefaultStatusId() {
  const [rows] = await pool.query(
    `
      SELECT id
      FROM task_statuses
      ORDER BY id ASC
      LIMIT 1
    `
  );
  return rows.length ? Number(rows[0].id) : null;
}

module.exports = {
  listStatuses,
  getStatusById,
  findStatusByName,
  createStatus,
  updateStatus,
  deleteStatus,
  countTasksUsingStatus,
  getDefaultStatusId
};
