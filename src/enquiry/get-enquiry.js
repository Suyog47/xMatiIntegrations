const { getFromMongoByPrefix } = require('../../utils/mongo-db');

async function getEnquiry() {
    try{
          // Get all enquiries from 'user-enquires' collection
            const enquiries = await getFromMongoByPrefix("user-enquires", "");

            if (!enquiries) {
                return false;
            }

            // Format the response with enquiry details
            const formattedEnquiries = enquiries.map(item => {
                // Extract email from key (format: email-timestamp)
                const email = item.key.split('-').slice(0, -1).join('-'); // Handle emails with hyphens

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
    }
    catch(error){
        console.error('Error retrieving enquiries:', error);
        return false;
    }
}

module.exports = { getEnquiry };