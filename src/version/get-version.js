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

module.exports = { getVersions };