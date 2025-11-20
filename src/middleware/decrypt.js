const CryptoJS = require("crypto-js");
const { getAESKeyForUser } = require("./aes");

function decryptPayload(req, res, next) {
  try {
    const email = req.user.email; // Use email as userId from JWT token
    const aesKey = getAESKeyForUser(email); // base64 key
    console.log('AES Key:', aesKey);
    const key = CryptoJS.enc.Base64.parse(aesKey);

    
    const { cipher, iv } = req.body.payload;

    if (!cipher || !iv) {
      return res.status(400).json({ 
        success: false, 
        msg: "Missing encrypted payload (cipher or iv)" 
      });
    }

    const decrypted = CryptoJS.AES.decrypt(cipher, key, {
      iv: CryptoJS.enc.Base64.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const json = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

    req.body = json;

    next();
  } catch (err) {
    console.error("AES decrypt error:", err);
    return res.status(400).json({ 
      success: false, 
      msg: "Invalid encrypted payload" 
    });
  }
}

module.exports = { decryptPayload };
