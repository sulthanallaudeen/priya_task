require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const statusRoutes = require("./routes/statusRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const { verifyDatabaseConnection } = require("./config/db");
const { requireAuth } = require("./middleware/authMiddleware");
const { ensureSeedAdmin } = require("./bootstrap/seedAdmin");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const allowedOrigins = String(
  process.env.FRONTEND_ORIGIN || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin is not allowed"));
    }
  })
);
app.use(express.json());

app.get("/api/test", (req, res) => {
  return res.json({
    status: "ok",
    appName: "Priya Task Manager API",
    message: "Backend is running"
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await verifyDatabaseConnection();
    return res.json({
      status: "ok",
      appName: "Priya Task Manager API",
      message: "API and database are reachable"
    });
  } catch (error) {
    return res.status(503).json({
      status: "error",
      message: "Database is not reachable"
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/statuses", requireAuth, statusRoutes);
app.use("/api/users", requireAuth, userRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await verifyDatabaseConnection();
    await ensureSeedAdmin();
    app.listen(PORT, () => {
      console.log(`Priya Task Manager backend listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    process.exit(1);
  }
}

startServer();
