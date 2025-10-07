const { getDocument } = require('../../utils/mongo-db');
const { passwordChangeConfirmationEmail } = require('../../templates/email_template');
const { sendEmail } = require('../../utils/send-email');
const { setUser } = require('../../src/authentication/user-auth/auth');

async function forgotPass(email, password) {
try{
 const s3Content = await getDocument("xmati-users", `${email}`);
        let data = s3Content;

        let updatedData = { ...data, password }

        let stats = await setUser(email, updatedData);
        if (stats) {
            const passwordChangeEmailTemplate = passwordChangeConfirmationEmail(data.fullName);
            sendEmail(email, null, null, passwordChangeEmailTemplate.subject, passwordChangeEmailTemplate.body);

            return true;
        }
        else {
            return false;
        }
    }
    catch(error){
        console.error("Error in forgotPass:", error);
        return false;
    }
}

module.exports = { forgotPass };