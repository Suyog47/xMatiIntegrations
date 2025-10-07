const { getDocument } = require('../utils/mongo-db'); // Update the path as needed

async function getMaintenance() {
    try {
        let data = await getDocument("xmati-extra", `maintenance-status`);

        if (!data) {
            return { status: false };
        }

        return { status: true, maintenance: data.status }
    }
    catch (error) {
        console.error('Error retrieving maintenance status:', error);
        return { status: false };
    }
}

module.exports = { getMaintenance };