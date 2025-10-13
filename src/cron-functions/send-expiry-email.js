const { getFromMongoByPrefix, getDocument } = require('../../utils/mongo-db');
const { renewalReminderEmail, afterOneWeekExpiryEmail } = require('../../templates/email_template');
const { sendEmail } = require('../../utils/send-email');

// Function to send expiry emails based on subscription status
async function sendExpiryEmail() {
    try {
        // Retrieve all keys from the 'xmati-subscriber' bucket
        const keys = await getFromMongoByPrefix('xmati-subscriber');

        if (!keys || keys.length === 0) {
            return { status: false, message: 'No subscriptions found' };
        }

        const currentDate = new Date();
        // Normalize currentDate to midnight
        const normalizedCurrentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

        for (const key of keys) {
            try {
                const data = key.data;
                let amount = data.amount;
                let subscription = data.subscription;

                // Validate and normalize the 'till' date
                if (!data.till) {
                    console.warn(`Skipping key ${key.key}: Missing 'till' value`);
                    continue;
                }

                const tillDate = new Date(data.till);
                if (isNaN(tillDate)) {
                    console.warn(`Skipping key ${key.key}: Invalid 'till' value`);
                    continue;
                }

                const normalizedTillDate = new Date(tillDate.getFullYear(), tillDate.getMonth(), tillDate.getDate());

                // Calculate the difference in days
                const timeDifference = normalizedTillDate - normalizedCurrentDate; // Difference in milliseconds
                const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24)); // Convert to days

                // Check if the daysRemaining matches the required values
                if (daysRemaining === 15 && data.subscription === 'Trial') {
                    continue; // Skip this key
                }

                if ([15, 7, 5, 3, 1, -7].includes(daysRemaining)) {
                    const userKey = key.key;
                    let userData = await getDocument('xmati-users', userKey);

                    if (!userData) {
                        console.error(`User data not found for key ${userKey}`);
                        continue;
                    }

                    if (data.subscription === 'Trial' && data.isCancelled === false) {
                        amount = userData.nextSubs.price;
                        subscription = userData.nextSubs.plan;
                    }

                    await emailDraftSend(key.key, data.name, subscription, daysRemaining, normalizedTillDate, amount, daysRemaining, data.isCancelled);
                }
            } catch (error) {
                console.error(`Error processing key ${key.key}:`, error.message);
                continue; // Skip this key and move to the next
            }
        }

        return {
            status: true,
            message: 'Expiry details retrieved successfully',
        };
    } catch (error) {
        console.error('Error in send-expiry-email:', error);
        return { status: false, message: 'Something went wrong', error: error.message };
    }
}


async function emailDraftSend(key, name, subscription, days, tillDate, amount, daysRemaining, isCancelled) {
    let email;
    try {
        email = key;
        let emailTemplate;
        if (daysRemaining === -7) {
            emailTemplate = afterOneWeekExpiryEmail(name);
        }
        else {
            emailTemplate = renewalReminderEmail(name, subscription, tillDate.toDateString(), amount, isCancelled);
        }
        await sendEmail(email, null, null, emailTemplate.subject, emailTemplate.body);
        console.log(`Email sent to ${email} about ${days} day(s) remaining.`);
    } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError.message);
    }
}

module.exports = { sendExpiryEmail }