const { saveDocument } = require('../../utils/mongo-db');

async function submitEnquiry(email, enquiry) {
    try {
        const enquiryKey = `${email}-${Date.now()}`; // Unique key for each enquiry

        const enquiryData = {
            enquiry,
            submittedAt: new Date().toISOString(), // Always use UTC
        };

        // Save to 'user-enquires' collection
        const result = await saveDocument("user-enquires", enquiryKey, enquiryData);

        if (!result) {
            return false;
        }

        return true
    } catch (error) {
        console.error('Error submitting enquiry:', error);
        return false;
    }
}

module.exports = { submitEnquiry };