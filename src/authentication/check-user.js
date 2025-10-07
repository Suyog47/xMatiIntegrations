const { mongoKeyExists } = require('../../utils/mongo-db');
const { forgotPasswordOtpEmail } = require('../../templates/email_template');
const { sendEmail } = require('../../utils/send-email');

async function checkUser(email, from) {
    try {
        let result = await mongoKeyExists("xmati-users", `${email}`);
        if (result) {
            // Generate a random 4-digit OTP
            const otp = Math.floor(1000 + Math.random() * 9000);

            if (from === 'forgot-pass') {
                // Send OTP email notification
                const forgotEmail = forgotPasswordOtpEmail(email, otp);
                sendEmail(email, null, null, forgotEmail.subject, forgotEmail.body);
            }

            return { status: true, otp };
        } else {
            return { status: false };
        }
    }
    catch (error) {
        console.error("Error deleting bot:", error);
        return { status: false };
    }
}

module.exports = { checkUser };