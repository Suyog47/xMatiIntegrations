const { getFromS3, saveToS3 } = require('../../utils/s3-service');
const { trialNextsubUpgradeEmail } = require('../../templates/email_template');
const { sendEmail } = require('../../utils/send-email');
const { Buffer } = require('buffer');


function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        stream.on("error", reject);
    });
}

async function nextSubUpgrade(email, plan, duration, price, isDowngrade) {
    try {
        // Get data from "xmati-users" bucket
        let userData = await getFromS3("xmati-users", `${email}.txt`);
        userData = await streamToString(userData);
        userData = JSON.parse(userData);

        userData.nextSubs = {
            ...userData.nextSubs,
            plan,
            duration,
            price,
            isDowngrade
        };

        // Save updated users data back to "xmati-users" bucket
        const userSaveResponse = await saveToS3("xmati-users", `${email}.txt`, JSON.stringify(userData));
        if (!userSaveResponse) {
            return { success: false, message: 'Failed to update user data' };
        }

        // Prepare email template
        const emailTemplate = trialNextsubUpgradeEmail(userData.fullName, plan, duration, price, isDowngrade);
        await sendEmail(email, null, null, emailTemplate.subject, emailTemplate.body);

        return { success: true, message: 'Subscription upgraded successfully' };
    } catch (error) {
        console.log(error);
        return { success: false, message: 'Something went wrong while upgrading the subscription inside users S3' };
    }
}

module.exports = { nextSubUpgrade };