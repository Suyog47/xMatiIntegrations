# Middleware Documentation

This directory contains reusable middleware functions for the application.

## Auth Middleware (`./auth.js`)

### `authenticateToken`
JWT authentication middleware that validates tokens and blocks unauthorized access.

**Usage:**
```javascript
// Protect a single route
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ user: req.user, message: 'Access granted' });
});

// Protect multiple routes
app.use('/api/protected', authenticateToken);
```

### `optionalAuth`
Optional authentication middleware that doesn't block if no token is provided.

**Usage:**
```javascript
// Route where authentication is optional
app.get('/public', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({ message: 'Hello ' + req.user.email });
  } else {
    res.json({ message: 'Hello guest' });
  }
});
```

### `generateToken(email)`
Generates a JWT token containing the user's email with 7-day expiration.

**Usage:**
```javascript
// Generate token after successful login
const token = generateToken('user@example.com');

// Token payload structure:
// { email: 'user@example.com', iat: timestamp, exp: timestamp }
```

## Common Middleware (`./common.js`)

### `disableTimeout`
Disables request timeout for heavy operations.

**Usage:**
```javascript
// Applied globally in index.js
app.use(disableTimeout);

// Or for specific routes
app.post('/heavy-operation', disableTimeout, handler);
```

### `validateRequiredFields(fields)`
Factory function that creates middleware to validate required fields in request body.

**Usage:**
```javascript
// Validate specific fields
app.post('/register', 
  validateRequiredFields(['email', 'password', 'fullName']), 
  (req, res) => {
    // Fields are guaranteed to exist here
  }
);
```

### `errorHandler`
Global error handling middleware. Should be placed at the end of middleware stack.

**Usage:**
```javascript
// Applied globally at the end (already done in index.js)
app.use(errorHandler);
```

## Examples

### Protected Route with Validation
```javascript
app.post('/create-subscription', 
  authenticateToken, 
  validateRequiredFields(['plan', 'duration']), 
  async (req, res) => {
    try {
      // Your route logic here
      const { plan, duration } = req.body;
      const userId = req.user.id;
      
      // Create subscription logic...
      res.json({ success: true });
    } catch (error) {
      throw error; // Will be caught by errorHandler
    }
  }
);
```

### Optional Auth Route
```javascript
app.get('/public-data', 
  optionalAuth, 
  async (req, res) => {
    const isAuthenticated = !!req.user;
    
    // Return different data based on auth status
    if (isAuthenticated) {
      // Return personalized data
    } else {
      // Return generic data
    }
  }
);
```

## JWT Authentication Flow

### Login Response
When a user successfully logs in via `/user-auth` endpoint, the response includes a JWT token:

```javascript
// Successful login response
{
  "success": true,
  "msg": "Login Successful",
  "s3Data": {
    "fullName": "John Doe",
    "email": "user@example.com",
    "subscription": "Pro",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // JWT token
  }
}
```

### Using the Token
```javascript
// Frontend: Store token after login
localStorage.setItem('token', response.s3Data.token);

// Frontend: Send token with requests
fetch('/api/protected-route', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

// Backend: Access user email in protected routes
app.get('/protected-route', authenticateToken, (req, res) => {
  const userEmail = req.user.email; // Available from JWT payload
  res.json({ message: `Hello ${userEmail}` });
});
```