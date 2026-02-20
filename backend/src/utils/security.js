const crypto = require("crypto");

const HASH_KEYLEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, HASH_KEYLEN).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }

  const [salt, expectedHash] = storedHash.split(":");
  const actualHash = crypto.scryptSync(password, salt, HASH_KEYLEN).toString("hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(actualHash, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function generateSessionToken() {
  return crypto.randomBytes(48).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function addDaysToNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 7));
  return date;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashToken,
  addDaysToNow
};
