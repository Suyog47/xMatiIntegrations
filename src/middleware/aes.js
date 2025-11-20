const crypto = require("crypto");

const userAESKeys = new Map();

const generateAESKey = (userId) => {
  // Generate a 32-byte AES-256 key
  const aesKey = crypto.randomBytes(32).toString("base64");
  userAESKeys.set(userId, aesKey);
  return aesKey;
}

// Retrieve stored key
function getAESKeyForUser(userId) {
  let key;

  if(!userAESKeys.has(userId)) {
    key = generateAESKey(userId);
    return key;
  }
  return userAESKeys.get(userId);
}

module.exports = { generateAESKey, getAESKeyForUser };