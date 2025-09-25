const { saveDocument,} = require("../utils/mongo-db");

async function clearNextSubs(email, userData) {
    try {
        // delete "nextSubs" key from user data
        delete userData.nextSubs;

        // Save updated user data back to "xmati-users" bucket
        const userSaveResponse = await saveDocument("xmati-users", `${email}`, JSON.stringify(userData));
        if (!userSaveResponse) {
            throw new Error('Failed to save user data');
        }
    } catch (error) {
        console.error(`Error clearing nextSubs for ${email}:`, error);
    }
}

module.exports = { clearNextSubs };
