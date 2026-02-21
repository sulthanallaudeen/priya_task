const mysql = require("mysql2/promise");

const sslEnabled = ["1", "true", "yes"].includes(
  String(process.env.DB_SSL || "").toLowerCase()
);
const sslRejectUnauthorized = !["0", "false", "no"].includes(
  String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "true").toLowerCase()
);

const basePoolConfig = {
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  dateStrings: true
};

const sslConfig = sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : undefined;

const poolConfig = process.env.DATABASE_URL
  ? {
      ...basePoolConfig,
      uri: process.env.DATABASE_URL,
      ...(sslConfig ? { ssl: sslConfig } : {})
    }
  : {
      ...basePoolConfig,
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "sql12817655",
      ...(sslConfig ? { ssl: sslConfig } : {})
    };

const pool = mysql.createPool(poolConfig);

async function verifyDatabaseConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  verifyDatabaseConnection
};
