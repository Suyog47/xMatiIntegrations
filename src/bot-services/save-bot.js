const { saveDocument } = require('../../utils/mongo-db');
const { botCreationSuccessEmail } = require('../../templates/email_template');
const { sendEmail } = require('../../utils/send-email');

async function saveBot(fullName, organizationName, key, data, from) {
    try {
        let result = await saveDocument("xmatibots", key, JSON.stringify(data));
        if (!result) {
            return false;
        }

        // Check if the environment is production before saving to "xmatibots-prod" bucket
        // eslint-disable-next-line no-undef
        const dbEnv = process.env.DB_ENV;
        if (dbEnv == 'prod') {
            await saveDocument("xmati-backed-bots", key, JSON.stringify(data));
        }

        let email = key.split('_')[0]
        let botName = (key.split('_')[1]).split('-')[1];

        if (from == 'user') {
            // Send email notification
            const botSuccessEmail = botCreationSuccessEmail(fullName, organizationName, botName);
            sendEmail(email, null, null, botSuccessEmail.subject, botSuccessEmail.body);
        }
        return true;
    } catch (error) {
        console.error("Error saving bot:", error);
        return false;
    }
}

module.exports = { saveBot };