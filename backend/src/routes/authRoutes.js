const express = require("express");
const {
  createUser,
  findUserByEmail,
  getUserById
} = require("../repositories/userRepository");
const {
  createSession,
  deleteSessionByTokenHash,
  deleteExpiredSessions
} = require("../repositories/sessionRepository");
const {
  validateRegisterPayload,
  validateLoginPayload
} = require("../utils/validators");
const {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashToken,
  addDaysToNow
} = require("../utils/security");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();
const SESSION_DAYS = Number(process.env.AUTH_SESSION_DAYS || 7);

async function createSessionResponse(user) {
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = addDaysToNow(SESSION_DAYS);
  await createSession({
    userId: user.id,
    tokenHash,
    expiresAt
  });

  return {
    token: rawToken,
    expiresAt,
    user
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const validation = validateRegisterPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.errors.join("; ") });
    }

    const existing = await findUserByEmail(validation.data.email);
    if (existing) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const created = await createUser({
      fullName: validation.data.fullName,
      email: validation.data.email,
      passwordHash: hashPassword(validation.data.password),
      role: "user",
      isActive: 1
    });

    const session = await createSessionResponse(created);
    return res.status(201).json(session);
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const validation = validateLoginPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.errors.join("; ") });
    }

    await deleteExpiredSessions();
    const user = await findUserByEmail(validation.data.email);
    if (!user || !verifyPassword(validation.data.password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is inactive" });
    }

    const publicUser = await getUserById(user.id);
    const session = await createSessionResponse(publicUser);
    return res.json(session);
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.authUser });
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await deleteSessionByTokenHash(req.tokenHash);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
