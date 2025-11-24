const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;  // max is 31 but 10 is a good balance between security and performance

async function hashPassword(plainPassword) {
  const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  return hashedPassword;
}

async function comparePasswords(plainPassword, hashedPassword) {
  const match = await bcrypt.compare(plainPassword, hashedPassword);
  return match;
}

module.exports = { hashPassword, comparePasswords };