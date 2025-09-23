const { saveToS3 } = require('../utils/s3-service');

async function clearNextSubs(email, userData) {
    try {
        // delete "nextSubs" key from user data
        delete userData.nextSubs;

        // Save updated user data back to "xmati-users" bucket
        const userSaveResponse = await saveToS3("xmati-users", `${email}.txt`, JSON.stringify(userData));
        if (!userSaveResponse) {
            throw new Error('Failed to save user data');
        }
    } catch (error) {
        console.error(`Error clearing nextSubs for ${email}:`, error);
    }
}

module.exports = { clearNextSubs };
