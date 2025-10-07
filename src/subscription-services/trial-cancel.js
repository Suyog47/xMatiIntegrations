const { saveDocument, getDocument } = require('../../utils/mongo-db');
const { clearNextSubs } = require('./nextsub-clear');

async function trialCancellation(email) {
    try {
        // Get data from "xmati-users" bucket
        let userData = await getDocument("xmati-users", `${email}`);

        // Remove "nextSubs" key from user data
        await clearNextSubs(email, userData);

        // Get data from "xmati-subscribers" bucket
        let subscriberData = await getDocument("xmati-subscriber", `${email}`);

        // Set "isCancelled" key to true
        subscriberData.isCancelled = true;

        // Save updated subscriber data back to "xmati-subscriber" bucket
        const subscriberSaveResponse = await saveDocument("xmati-subscriber", `${email}`, JSON.stringify(subscriberData));
        if (!subscriberSaveResponse) {
            return false;
        }
        return true;
    }
    catch (error) {
        console.error('Error occurred during trial cancellation:', error);
        return false;
    }
}

module.exports = { trialCancellation };