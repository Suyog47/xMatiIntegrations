const { getDocument } = require('../../utils/mongo-db');

async function getVersions() {
    try {
        // Get specific version by key
        const result = await getDocument("xmati-versions", "versions");
        if (result) {
            return { 
                status: true, 
                message: 'Version retrieved successfully', 
                data: result 
            };
        } else {
            return { 
                status: false, 
                message: 'Version not found' 
            };
        }
    } catch (error) {
        console.error("Error retrieving version:", error);
        return { 
            status: false, 
            message: 'Something went wrong while retrieving version', 
            error: error.message 
        };
    }
}

/**
 * Check if the provided version matches the stored version
 * @param {string} clientVersion - Version sent by client in header
 * @returns {Object} Validation result
 */
async function validateVersion(clientVersion) {
    try {
        const result = await getDocument("xmati-versions", "versions");
        if (!result) {
            return { 
                valid: false, 
                message: 'Server version not found' 
            };
        }
        
        // Assuming the result contains a version field
        const serverVersion = result['child-node'];
        
        if (clientVersion === serverVersion) {
            return { 
                valid: true, 
                message: 'Version match' 
            };
        } else {
            return { 
                valid: false, 
                message: `Version mismatch. Client: ${clientVersion}, Server: ${serverVersion}` 
            };
        }
    } catch (error) {
        console.error("Error validating version:", error);
        return { 
            valid: false, 
            message: 'Error validating version', 
            error: error.message 
        };
    }
}

module.exports = { getVersions, validateVersion };