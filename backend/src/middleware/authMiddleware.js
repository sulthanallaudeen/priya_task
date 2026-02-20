const { getSessionByTokenHash } = require("../repositories/sessionRepository");
const { hashToken } = require("../utils/security");

function extractBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice(7).trim();
  return token || null;
}

async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const tokenHash = hashToken(token);
    const session = await getSessionByTokenHash(tokenHash);
    if (!session) {
      return res.status(401).json({ message: "Invalid session token" });
    }

    if (!session.user.isActive) {
      return res.status(403).json({ message: "Your account is inactive" });
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return res.status(401).json({ message: "Session expired" });
    }

    req.authUser = session.user;
    req.tokenHash = tokenHash;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.authUser || req.authUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
