const jwt = require('jsonwebtoken');

// JWT Secret Key
const SECRET_KEY = 'supersecretfrontendkey';

// Generate JWT Token
const generateToken = (email) => {
  const payload = { email };
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '2h' }); // Token expires in 24 hours
  return token;
};

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'No token found' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token format invalid' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

// Optional: Create a middleware for optional authentication (doesn't block if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next(); // Continue without authentication
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(); // Continue without authentication
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (!err) {
      req.user = decoded;
    }
    next(); // Continue regardless of token validity
  });
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  SECRET_KEY
};