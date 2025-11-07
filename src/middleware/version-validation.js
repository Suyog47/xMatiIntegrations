const { validateVersion } = require('../version/get-version');

/**
 * Middleware to validate X-App-Version header
 * Checks if the client version matches the stored version in xmati-versions collection
 */
async function versionValidation(req, res, next) {
    try {
        const clientVersion = req.headers['x-app-version'];
        
        if (!clientVersion) {
            return res.status(400).json({
                success: false,
                msg: 'X-App-Version header is required'
            });
        }

        const validationResult = await validateVersion(clientVersion);
        if (!validationResult.valid) {
            return res.status(400).json({
                success: false,
                msg: 'Version mismatch',
                details: validationResult.message
            });
        }
        
        // Version is valid, continue to next middleware
        next();
    } catch (error) {
        console.error('Version validation error:', error);
        return res.status(500).json({
            success: false,
            msg: 'Internal server error during version validation'
        });
    }
}

module.exports = { versionValidation };