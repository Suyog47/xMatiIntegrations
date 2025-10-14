// Timeout middleware
const disableTimeout = (req, res, next) => {
  res.setTimeout(0);
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error'
  });
  next();
};

// Validate required fields middleware factory
const validateRequiredFields = (fields) => {
  return (req, res, next) => {
    const missingFields = fields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields
      });
    }
    
    next();
  };
};

module.exports = {
  disableTimeout,
  errorHandler,
  validateRequiredFields
};