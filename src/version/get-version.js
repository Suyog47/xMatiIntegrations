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

        // Helper function to compare semantic versions
        const compareVersions = (clientVer, serverVer) => {
            const clientParts = clientVer.split('.').map(Number);
            const serverParts = serverVer.split('.').map(Number);
            
            // Ensure both arrays have the same length by padding with zeros
            const maxLength = Math.max(clientParts.length, serverParts.length);
            while (clientParts.length < maxLength) clientParts.push(0);
            while (serverParts.length < maxLength) serverParts.push(0);
            
            for (let i = 0; i < maxLength; i++) {
                if (clientParts[i] > serverParts[i]) return 1;
                if (clientParts[i] < serverParts[i]) return -1;
            }
            return 0; // versions are equal
        };

        const versionComparison = compareVersions(clientVersion, serverVersion);
        
        if (versionComparison >= 0) {
            return { 
                valid: true, 
                message: 'Version match' 
            };
        } else {
            console.warn("Version mismatch:", clientVersion, serverVersion);
            return { 
                valid: false, 
                message: `Version mismatch. Client: ${clientVersion}, Server: ${serverVersion}` 
            };
        }
    } catch (error) {
        return { 
            valid: false, 
            message: 'Error validating version', 
            error: error.message 
        };
    }
}

module.exports = { getVersions, validateVersion };