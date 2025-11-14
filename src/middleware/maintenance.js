const { getMaintenance } = require('../maintenance');

/**
 * Middleware to check if the application is in maintenance mode
 * If maintenance is enabled, returns a maintenance response
 * Skips maintenance check for service account: xmatiservice@gmail.com
 */
async function maintenanceValidation(req, res, next) {
    try {
        // Check if the user is the service account - extract email from various sources
        let userEmail = null;
        
        // // 1. Check if user is authenticated and email is in JWT token
        // if (req.user && req.user.email) {
        //     userEmail = req.user.email;
        // }

        // 1. Check if email is in request body
        if (req.body && req.body.email) {
            userEmail = req.body.email;
        }
        // 2. Check if email is in request body data object
        else if (req.body && req.body.data && req.body.data.email) {
            userEmail = req.body.data.email;
        }
        // 3. Check if key field contains email (for some endpoints)
        else if (req.body && req.body.key && req.body.key.includes('@')) {
            userEmail = req.body.key;
        }
        
        // Skip maintenance check for service account
        if (userEmail === 'xmatiservice@gmail.com') {
            return next();
        }
        
        const maintenanceResult = await getMaintenance();
        
        if (maintenanceResult.status && maintenanceResult.maintenance === true) {
            return res.status(503).json({
                success: false,
                msg: 'Application is currently under maintenance. Please try again later.',
                maintenance: true
            });
        }
        
        // Not in maintenance mode, continue to next middleware
        next();
    } catch (error) {
        console.error('Maintenance validation error:', error);
        // If there's an error checking maintenance status, allow the request to continue
        // This ensures the app doesn't break if maintenance status can't be retrieved
        next();
    }
}

module.exports = { maintenanceValidation };