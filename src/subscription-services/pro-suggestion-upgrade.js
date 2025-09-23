const { getFromS3, saveToS3 } = require('../../utils/s3-service');
const { sendEmail } = require('../../utils/send-email');
const { proSuggestionUpdateEmail } = require('../../templates/email_template');
const { Buffer } = require('buffer');

function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        stream.on("error", reject);
    });
}

async function proSuggestionUpgrade(email, plan, duration, price) {
    try {
        // Get data from "xmati-users" bucket
        let userData = await getFromS3("xmati-users", `${email}.txt`);
        userData = await streamToString(userData);
        userData = JSON.parse(userData);
    
            // Check if the user is on a Starter plan and set nextSubs Value
            if (plan === 'Starter') {
                userData.nextSubs = {
                    ...userData.nextSubs,
                    suggested: true
                };
            }
            else {
                userData.nextSubs = {
                    plan,
                    duration,
                    price,
                    suggested: true
                };
            }
            // Save updated users data back to "xmati-users" bucket
            const userSaveResponse = await saveToS3("xmati-users", `${email}.txt`, JSON.stringify(userData));
            if (!userSaveResponse) {
                return { success: false, message: 'Failed to update user data' };
            }
    
            // Prepare email template
            const emailTemplate = proSuggestionUpdateEmail((plan === 'Starter') ? false : true, userData.fullName);
            await sendEmail(email, null, null, emailTemplate.subject, emailTemplate.body);

            return { success: true, message: 'Subscription upgraded successfully' };
        } catch (error) {
            console.log(error);
            return { status: false, message: 'Something went wrong while upgrading the subscription inside users S3' };
        }
}

module.exports = { proSuggestionUpgrade };