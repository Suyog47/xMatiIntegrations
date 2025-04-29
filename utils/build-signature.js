const crypto = require("crypto");

function buildSignatureHeader(buf, channelSecretKey) {
  return "sha256=" + buildSignature(buf, channelSecretKey);
}

// Function to generate the HMAC signature
function buildSignature(buf, channelSecretKey) {
  const hmac = crypto.createHmac("sha256", Buffer.from(channelSecretKey, "utf8"));
  hmac.update(buf);
  return hmac.digest("hex");
}

module.exports = {
  buildSignatureHeader,
};
