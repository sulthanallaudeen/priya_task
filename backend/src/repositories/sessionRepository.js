const { pool } = require("../config/db");

async function createSession(session) {
  await pool.query(
    `
      INSERT INTO user_sessions (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `,
    [session.userId, session.tokenHash, session.expiresAt]
  );
}

async function getSessionByTokenHash(tokenHash) {
  const [rows] = await pool.query(
    `
      SELECT
        s.id AS session_id,
        s.user_id,
        s.expires_at,
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM user_sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
      LIMIT 1
    `,
    [tokenHash]
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    expiresAt: row.expires_at,
    user: {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  };
}

async function deleteSessionByTokenHash(tokenHash) {
  await pool.query("DELETE FROM user_sessions WHERE token_hash = ?", [tokenHash]);
}

async function deleteExpiredSessions() {
  await pool.query("DELETE FROM user_sessions WHERE expires_at < NOW()");
}

module.exports = {
  createSession,
  getSessionByTokenHash,
  deleteSessionByTokenHash,
  deleteExpiredSessions
};
