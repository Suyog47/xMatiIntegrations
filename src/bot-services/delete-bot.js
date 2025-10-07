const { deleteFromMongo } = require('../../utils/mongo-db');
const { botDeletionConfirmationEmail } = require('../../templates/email_template');
const { sendEmail } = require('../../utils/send-email');

async function deleteBot(fullName, key) {
    try {
        let result = await deleteFromMongo("xmatibots", key);
        if (!result) {
            return false
        }

        let email = key.split('_')[0]
        let botName = (key.split('_')[1]).split('-')[1];

        // Send email notification
        const botDeleteEmail = botDeletionConfirmationEmail(fullName, botName);
        sendEmail(email, null, null, botDeleteEmail.subject, botDeleteEmail.body);

        return true;
    }
    catch (error) {
        console.error("Error deleting bot:", error);
        return false;
    }
}

module.exports = { deleteBot };