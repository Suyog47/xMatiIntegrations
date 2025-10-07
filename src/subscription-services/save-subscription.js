// Import or define the required helper functions at the top of the file
const { saveDocument,} = require("../../utils/mongo-db");
const { welcomeSubscription, paymentReceiptEmail } = require('../../templates/email_template');
const { sendEmail } = require('../../utils/send-email');

async function saveSubscriptionToS3(key, name, subscription, duration, rdays = 0, amount, isCancelled = false) {
    try {
        const currentDate = new Date();
        let newDate;

        if (subscription === 'Trial') {
            let days = 5;

            if (duration === '15d') {
                // Add 15 days
                days = 15
            }
            else if (duration === '5d') {
                // Add 5 days
                days = 5
            }

            newDate = new Date(new Date().setDate(currentDate.getDate() + days));
        } else {
            if (duration === 'monthly') {
                newDate = new Date(new Date().setMonth(currentDate.getMonth() + 1));
            }
            else if (duration === 'half-yearly') {
                newDate = new Date(new Date().setMonth(currentDate.getMonth() + 6));
            }
            else if (duration === 'yearly') {
                newDate = new Date(new Date().setFullYear(currentDate.getFullYear() + 1));
            }
            else if (duration === 'custom') {
                newDate = new Date(new Date().setDate(currentDate.getDate() + rdays));
            }
            else {
                return { status: false, msg: 'Invalid duration' };
            }
        }

        const data = {
            name,
            subscription,
            createdAt: currentDate,
            till: newDate,
            duration,
            amount,
            isCancelled
        }

        let result = await saveDocument("xmati-subscriber", `${key}`, JSON.stringify(data));
        if (!result) {
            return { status: false, msg: 'Failed to save user subscription' };
        }

        let normalizedNewDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        if (!isCancelled) {
            const emailTemplate = welcomeSubscription(name, subscription, duration, normalizedNewDate.toDateString());

            // Send welcome email
            if (subscription === 'Trial') {
                sendEmail(key, null, null, emailTemplate.subject, emailTemplate.body);
            }

            // Send payment email
            if (subscription !== 'Trial') {
                const paymentEmailTemplate = paymentReceiptEmail(name, subscription, duration, amount, normalizedNewDate.toDateString());
                sendEmail(key, null, null, paymentEmailTemplate.subject, paymentEmailTemplate.body);
            }
        }

        return { status: true };
    } catch (error) {
        return { status: false, msg: error.message || 'Something went wrong while saving the subscription' };
    }
}

module.exports = { saveSubscriptionToS3 };