const {
  findUserByEmail,
  createUser,
  getFirstActiveAdmin
} = require("../repositories/userRepository");
const { hashPassword } = require("../utils/security");

async function ensureSeedAdmin() {
  const activeAdmin = await getFirstActiveAdmin();
  if (activeAdmin) {
    return activeAdmin;
  }

  const email = String(
    process.env.ADMIN_SEED_EMAIL || "admin@ptm.com"
  ).toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD || "Admin@123";
  const fullName = process.env.ADMIN_SEED_NAME || "System Admin";

  const existing = await findUserByEmail(email);
  if (existing) {
    return existing;
  }

  return createUser({
    fullName,
    email,
    passwordHash: hashPassword(password),
    role: "admin",
    isActive: 1
  });
}

module.exports = {
  ensureSeedAdmin
};
