const { getFromMongoByPrefix } = require('../../utils/mongo-db');

async function getUserEnquiries(email) {
    try {
        // Get enquiries for specific user from 'user-enquires' collection
        // The key format is: email-timestamp, so we search by email prefix
        const enquiries = await getFromMongoByPrefix("user-enquires", `${email}-`);

        if (!enquiries || enquiries.length === 0) {
            return [];
        }

        // Format the response with enquiry details
        const formattedEnquiries = enquiries.map(item => {
            return {
                id: item.key,
                email: email,
                enquiry: item.data.enquiry,
                submittedAt: item.data.submittedAt,
            };
        });

        // Sort by submission date (newest first)
        formattedEnquiries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        return formattedEnquiries;
    } catch (error) {
        console.error('Error retrieving user enquiries:', error);
        return false;
    }
}

module.exports = { getUserEnquiries };