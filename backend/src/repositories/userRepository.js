const { pool } = require("../config/db");

function mapUserRecord(record) {
  return {
    id: record.id,
    fullName: record.full_name,
    email: record.email,
    role: record.role,
    isActive: Boolean(record.is_active),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    taskCount: record.task_count !== undefined ? Number(record.task_count) : undefined
  };
}

async function createUser(user) {
  const [result] = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `,
    [user.fullName, user.email, user.passwordHash, user.role || "user", user.isActive ?? 1]
  );

  return getUserById(result.insertId);
}

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `
      SELECT id, full_name, email, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email]
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    ...mapUserRecord(row),
    passwordHash: row.password_hash
  };
}

async function getUserById(userId) {
  const [rows] = await pool.query(
    `
      SELECT id, full_name, email, role, is_active, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows.length ? mapUserRecord(rows[0]) : null;
}

async function listUsers(filters) {
  const whereClauses = [];
  const values = [];

  if (filters.search) {
    whereClauses.push("(u.full_name LIKE ? OR u.email LIKE ?)");
    values.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const offset = (filters.page - 1) * filters.limit;

  const [rows] = await pool.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        u.updated_at,
        COUNT(t.id) AS task_count
      FROM users u
      LEFT JOIN tasks t ON t.assigned_to_user_id = u.id
      ${whereSql}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...values, filters.limit, offset]
  );

  const [countRows] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM users u
      ${whereSql}
    `,
    values
  );

  return {
    users: rows.map(mapUserRecord),
    total: Number(countRows[0].total),
    page: filters.page,
    limit: filters.limit
  };
}

async function updateUser(userId, updates) {
  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(updates, "role")) {
    fields.push("role = ?");
    values.push(updates.role);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "isActive")) {
    fields.push("is_active = ?");
    values.push(updates.isActive ? 1 : 0);
  }

  if (!fields.length) {
    return getUserById(userId);
  }

  values.push(userId);
  await pool.query(
    `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = ?
    `,
    values
  );

  return getUserById(userId);
}

async function countAdmins() {
  const [rows] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM users
      WHERE role = 'admin' AND is_active = 1
    `
  );
  return Number(rows[0].total);
}

async function getFirstActiveAdmin() {
  const [rows] = await pool.query(
    `
      SELECT id, full_name, email, role, is_active, created_at, updated_at
      FROM users
      WHERE role = 'admin' AND is_active = 1
      ORDER BY id ASC
      LIMIT 1
    `
  );
  return rows.length ? mapUserRecord(rows[0]) : null;
}

module.exports = {
  createUser,
  findUserByEmail,
  getUserById,
  listUsers,
  updateUser,
  countAdmins,
  getFirstActiveAdmin
};
