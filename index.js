const express = require('express');
// const { Buffer } = require('buffer');
const cron = require('node-cron');
const { login, register, updateUserPassOrProfile } = require('./src/authentication/user-auth/auth');
const { sendEmail } = require('./utils/send-email');
const { sendExpiryEmail } = require('./src/cron-functions/send-expiry-email');
const { autoRenewSubscription } = require('./src/cron-functions/auto-sub-renewal');
const { forgotPass } = require('./src/authentication/forgot-pass');
// const { saveDocument, getDocument, getFromMongoByPrefix, deleteFromS3, keyExists } = require('./utils/s3-service');
const { getMaintenance } = require('./src/maintenance');
const { updateCard } = require('./src/payment-gateway/update-card');
const { proSuggestionUpgrade } = require('./src/subscription-services/pro-suggestion-upgrade');
const { nextSubUpgrade } = require('./src/subscription-services/nextsub-upgrade');
const { clearNextSubs } = require('./src/subscription-services/nextsub-clear');
const { SaveSubscription } = require('./src/subscription-services/save-subscription');
const { cancelSubscription } = require('./src/subscription-services/cancel-subs');
const { saveDocument, getDocument, getFromMongoByPrefix, deleteFromMongo } = require("./utils/mongo-db");
const { saveBot } = require('./src/bot-services/save-bot');
const { deleteBot } = require('./src/bot-services/delete-bot');
const { submitEnquiry } = require('./src/enquiry/submit-enquiry');
const { getEnquiry } = require('./src/enquiry/get-enquiry');
const { getUserEnquiries } = require('./src/enquiry/get-user-enquiries');
const {
    paymentFailedEmail,
    profileUpdateConfirmationEmail,
    passwordChangeConfirmationEmail,
    registrationEmailVerificationOtpEmail,
    registrationRollbackEmail,
} = require('./templates/email_template');
const { downloadCSV } = require('./src/csv-download');
const { checkUser } = require('./src/authentication/check-user');
const WebSocketManager = require('./src/websocket/websocket-manager');
const { trialCancellation } = require('./src/subscription-services/trial-cancel');
const { createPaymentIntent, getOrCreateCustomerByEmail, getStripeTransaction, refundCharge, getCardDetails } = require('./src/payment-gateway/stripe');
const { authenticateToken, generateToken } = require('./src/middleware/auth');
const { generateAESKey, getAESKeyForUser } = require('./src/middleware/aes');
const { disableTimeout, errorHandler, validateRequiredFields } = require('./src/middleware/common');
const { versionValidation } = require('./src/middleware/version-validation');
const { maintenanceValidation } = require('./src/middleware/maintenance');
const { getVersions } = require('./src/version/get-version');
const { decryptPayload } = require('./src/middleware/decrypt');
const { hashPassword } = require('./utils/pass_bcrpyt');
const cors = require("cors");

const app = express();
const http = require('http');
require('dotenv').config();

// List of allowed origins
const allowedOrigins = [
    'https://www.app.xmati.ai',
    'https://www.app.xmati.ai/utils',
    'https://app.xmati.ai',
    'https://app.xmati.ai/utils',
    'http://localhost:3000',
    'http://localhost:7001'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like Postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

const server = http.createServer(app);

// Initialize WebSocket Manager
const wsManager = new WebSocketManager(server);

// Disable timeout at server level
server.timeout = 0;

//Disable timeout before any heavy middlewares
app.use(disableTimeout);

app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

// Initialize Stripe
require('dotenv').config();
// eslint-disable-next-line no-undef
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


// const client = new SpeechClient({
//     keyFilename: 'gemini-service-account.json'
//     //projectId: 'gen-lang-client-0617251816' // Your GCP project ID
// });
// const translationClient = new TranslationServiceClient();

// sample get
app.get('/', (req, res) => {
    res.send('Hello, Express!');
});

// ################ Before Auth APIs ################

// Endpoint for user authentication through S3
app.post('/user-auth',      // before 
    versionValidation,
    maintenanceValidation,

    validateRequiredFields(['data', 'from']),
    async (req, res) => {
        try {
            const { data, from } = req.body;
            let result;
            let status;
            let success;
            let msg;
            let dbData = {};

            if (from === "login") {
                result = await login(data.email, data.password);

                if (result === "wrong pass") {
                    status = 400;
                    success = false;
                    msg = "Incorrect Password";
                }
                else if (result === "not exist") {
                    status = 400;
                    success = false;
                    msg = "User does not exist";
                }
                else {
                    status = 200;
                    success = true;
                    msg = "Login Successful";
                    dbData = result;

                    // Generate AES key
                    const aesKey = generateAESKey(data.email);
                    dbData.aesKey = aesKey;

                    // Generate JWT token with email
                    const token = generateToken(data.email);
                    dbData.token = token;
                }
            }

            if (from === "register") {
                const nextSubsData = data.nextSubs;

                // hashing password before saving
                const hashedPassword = await hashPassword(data.password);

                result = await register(data.email, { ...data, password: hashedPassword });
                if (result === "already exist") {
                    status = 400;
                    success = false;
                    msg = "User already exists";
                }
                else if (result === "success") {
                    status = 200;
                    success = true;
                    msg = "User registered successfully";

                    // Save subscription details
                    let response;
                    if (nextSubsData.plan !== 'Starter') {
                        response = await SaveSubscription(data.email, data.fullName, "Trial", "30d", 0, 0, false);
                    } else {
                        response = await SaveSubscription(data.email, data.fullName, nextSubsData.plan, nextSubsData.duration, 0, nextSubsData.price, false);
                    }

                    if (!response.status) {
                        status = 400;
                        success = false;
                        msg = response.msg || "Failed to save subscription details";
                    }

                    if (response.status) {
                        // Generate JWT token with email
                        const token = generateToken(data.email);
                        dbData.token = token;
                    }
                }
                else {
                    status = 400;
                    success = false;
                    msg = "Something went wrong";
                }
            }
            return res.status(status).json({ success, msg, dbData });
        }
        catch (err) {
            console.log(err);
            return res.status(400).json({ success: false, msg: "Something went wrong" });
        }
    });

app.post('/get-jwt-token',    // before
    versionValidation,
    validateRequiredFields(['email']),
    async (req, res) => {
        try {
            const { email } = req.body;

            // Generate JWT token
            const token = generateToken(email);
            return res.status(200).json({ success: true, token });
        } catch (error) {
            console.error('Error generating JWT token:', error);
            return res.status(500).json({ success: false, msg: 'Failed to get JWT token' });
        }
    });

app.post('/get-aes-key',    // before
    versionValidation,

    validateRequiredFields(['email']),
    async (req, res) => {
        try {
            const { email } = req.body;

            // Retrieve AES key for user
            const aesKey = getAESKeyForUser(email);
            if (!aesKey) {
                return res.status(404).json({ success: false, msg: 'AES key not found' });
            }

            return res.status(200).json({ success: true, aesKey });
        } catch (error) {
            console.error('Error retrieving AES key:', error);
            return res.status(500).json({ success: false, msg: 'Failed to retrieve AES key' });
        }
    });

app.post('/send-email',     // before
    versionValidation,
    maintenanceValidation,
    authenticateToken,
    validateRequiredFields(['to', 'subject', 'content']),
    async (req, res) => {
        try {
            const { to, cc, bcc, subject, content } = req.body;

            let result = await sendEmail(to, cc, bcc, subject, content);
            if (!result) {
                return res.status(400).json({ status: false, error: 'Failed to send email' });
            }
            // Email sent successfully
            return res.status(200).json({ status: true, message: 'Email sent successfully!' });
        } catch (error) {
            return res.status(500).json({ status: false, error: error || 'Failed to send email' });
        }
    });

app.post('/check-user',   // before
    maintenanceValidation,
    validateRequiredFields(['email', 'from']),
    async (req, res) => {
        try {
            const { email, from } = req.body;

            let result = await checkUser(email, from);

            if (result.status) {
                return res.status(200).json({ status: true, message: 'User exists', otp: result.otp });
            } else {
                return res.status(400).json({ status: false, message: 'No User' });
            }
        } catch (error) {
            console.log(error);
            return res.status(500).json({ status: false, error: 'Something went wrong while checking the user' });
        }
    });

app.post('/send-email-otp',  // before
    maintenanceValidation,
    validateRequiredFields(['fullName', 'email', 'otp']),
    async (req, res) => {
        const { fullName, email, otp } = req.body;

        const emailTemplate = registrationEmailVerificationOtpEmail(fullName, otp);
        await sendEmail(email, null, null, emailTemplate.subject, emailTemplate.body);
        res.status(200).json({ status: true, message: 'OTP email sent successfully' });
    });

app.post('/forgot-pass',  // before
    versionValidation,
    maintenanceValidation,

    validateRequiredFields(['email', 'password']),
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // hash password first
            const hashedPassword = await hashPassword(password);

            let result = await forgotPass(email, hashedPassword);
            if (!result) {
                return res.status(400).json({ status: false, msg: 'Failed to update password' });
            }

            return res.status(200).json({ status: true, msg: 'Password updated successfully' });
        } catch (error) {
            console.log(error);
            return res.status(500).send('Something went wrong while updating the password');
        }
    });

app.post('/get-subscription',   // before
    versionValidation,
    maintenanceValidation,

    validateRequiredFields(['key']),
    async (req, res) => {
        try {
            const { key } = req.body;

            let result = await getDocument("xmati-subscriber", `${key}`);
            let data = result;
            if (!result) {
                return res.status(400).json({ status: false, msg: 'Failed to get user subscription' });
            }

            return res.status(200).json({ status: true, msg: 'User Subscription received successfully', data });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ status: false, msg: 'Something went wrong while getting the user subscription' });
        }
    });

app.post('/create-setup-intent',   // before
    maintenanceValidation,
    validateRequiredFields(['email', 'customerId']),
    async (req, res) => {
        const { email, customerId } = req.body;

        try {
            let customer = null;
            if (customerId === '-') {
                customer = await getOrCreateCustomerByEmail(email);
            } else {
                customer = customerId;
            }

            const setupIntent = await stripe.setupIntents.create({
                customer: customer.id,
                usage: 'off_session',
            });

            res.json({ clientSecret: setupIntent.client_secret, customerId: customer.id });
        } catch (err) {
            console.error('Error creating SetupIntent:', err.message);
            res.status(500).json({ error: err.message });
        }
    });



// ################ After Auth APIs ################

app.post('/update-profile',   // after
    versionValidation,
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['data']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { data } = req.body;
            const email = req.user.email; // Get email from JWT token

            // Update user profile
            let result = await updateUserPassOrProfile(email, data);

            if (result === "success") {
                // Send email notification for profile update
                const profileChangeEmailTemplate = profileUpdateConfirmationEmail(data.fullName);
                sendEmail(email, null, null, profileChangeEmailTemplate.subject, profileChangeEmailTemplate.body);

                return res.status(200).json({
                    success: true,
                    msg: "Profile updated successfully"
                });
            }
            else if (result === "not exist") {
                return res.status(400).json({
                    success: false,
                    msg: "User does not exist"
                });
            }
            else {
                return res.status(400).json({
                    success: false,
                    msg: "Something went wrong"
                });
            }
        }
        catch (err) {
            console.log(err);
            return res.status(500).json({ success: false, msg: "Something went wrong" });
        }
    });

app.post('/update-password',   // after
    versionValidation,
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['data']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { data } = req.body;
            const email = req.user.email; // Get email from JWT token


            //hash password first
            const hashedPassword = await hashPassword(data.password);

            // Update user password
            let result = await updateUserPassOrProfile(email, { ...data, password: hashedPassword });

            if (result === "success") {
                // Send email notification for password change
                const passChangeEmailTemplate = passwordChangeConfirmationEmail(data.fullName);
                sendEmail(email, null, null, passChangeEmailTemplate.subject, passChangeEmailTemplate.body);

                return res.status(200).json({
                    success: true,
                    msg: "Password updated successfully"
                });
            }
            else if (result === "not exist") {
                return res.status(400).json({
                    success: false,
                    msg: "User does not exist"
                });
            }
            else {
                return res.status(400).json({
                    success: false,
                    msg: "Something went wrong"
                });
            }
        }
        catch (err) {
            console.log(err);
            return res.status(500).json({ success: false, msg: "Something went wrong" });
        }
    });

app.post('/update-card-info',   // after
    versionValidation,
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['email', 'customerId', 'paymentMethodId', 'data']),
    maintenanceValidation,
    async (req, res) => {
        const { email, customerId, paymentMethodId, data } = req.body;

        try {
            let result = await updateCard(email, customerId, paymentMethodId, data);

            if (result.success === true) {
                return res.status(200).json({
                    success: true,
                    msg: 'Stripe customer created and payment method attached successfully'
                });
            }

            return res.status(400).json({
                success: false,
                msg: result.msg || 'Failed to update user card details'
            });
        } catch (error) {
            console.error('Error creating Stripe customer:', error.message);
            return res.status(500).json({ success: false, msg: error.message });
        }
    });

app.post('/get-card-details',   // after
    versionValidation,
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['paymentMethodId']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { paymentMethodId } = req.body;

            const cardDetailsResponse = await getCardDetails(paymentMethodId);
            if (!cardDetailsResponse.success) {
                return res.status(400).json(cardDetailsResponse);
            }

            return res.status(200).json({ success: true, cardDetails: cardDetailsResponse.cardDetails });
        } catch (error) {
            console.error('Error retrieving card details:', error.message);
            return res.status(500).json({ success: false, message: error.message });
        }
    });

app.post('/pro-suggestion-update',   // after
    versionValidation,
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['email', 'plan', 'duration', 'price']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { email, plan, duration, price } = req.body;

            let result = await proSuggestionUpgrade(email, plan, duration, price);

            if (result.success === true) {
                return res.status(200).json({ success: true, message: 'Subscription upgraded successfully' });
            }
            return res.status(400).json({ success: false, message: result.msg || 'Failed to upgrade subscription' });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ status: false, message: 'Something went wrong while upgrading the subscription inside users S3' });
        }
    });

app.post('/submit-enquiry',   // after
    versionValidation,
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['email', 'enquiry']),
    maintenanceValidation,
    async (req, res) => {
        const { email, enquiry } = req.body;

        try {
            let result = await submitEnquiry(email, enquiry);

            if (!result) {
                return res.status(400).json({
                    success: false,
                    msg: 'Failed to submit enquiry'
                });
            }

            return res.status(200).json({
                success: true,
                msg: 'Enquiry submitted successfully',
            });
        } catch (error) {
            console.error('Error submitting enquiry:', error);
            return res.status(500).json({
                success: false,
                msg: 'Something went wrong while submitting the enquiry'
            });
        }
    });

app.post('/get-user-enquiries',   // after 
    versionValidation,
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['email']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { email } = req.body;

            let result = await getUserEnquiries(email);

            if (result === false) {
                return res.status(400).json({
                    success: false,
                    msg: 'Failed to retrieve user enquiries'
                });
            }

            return res.status(200).json({
                success: true,
                msg: 'User enquiries retrieved successfully',
                data: result,
            });
        } catch (error) {
            console.error('Error retrieving user enquiries:', error);
            return res.status(500).json({
                success: false,
                msg: 'Something went wrong while retrieving user enquiries'
            });
        }
    });

app.post('/check-account-status',   // after

    validateRequiredFields(['email']),
    async (req, res) => {
        const { email, isMother = false } = req.body;
        try {
            // Maintenance status check
            let data = await getMaintenance();
            triggerMaintenanceStatus(email, data.maintenance);

            // Block status check
            const userData = await getDocument("xmati-users", email.replace(/_util/g, ''));
            triggerBlock(email, userData.blocked || false);

            // Version check if the app is not Mother
            if (!isMother) {
                const result = await getVersions();
                triggerVersionMismatch(email, result.data['child-node']);
            }

            res.status(200);
        } catch (error) {
            console.log(error);
            return res.status(500).json({ status: false, msg: 'Something went wrong while checking account status' });
        }
    });

// not used
app.post('/get-maintenance',  // after
    versionValidation,

    validateRequiredFields(['email']),
    async (req, res) => {
        const { email } = req.body;
        let data = await getMaintenance();

        if (data.status) {
            triggerMaintenanceStatus(email, data.maintenance);
            return res.status(200).json({ status: true, msg: 'Maintenance status retrieved successfully', data: data.maintenance });
        }
        else {
            return res.status(500).json({ status: false, msg: 'Something went wrong while retrieving the maintenance status', data: true }); // by default keep it as true
        }
    });

// not used
app.post('/get-versions',   // after
    maintenanceValidation,

    validateRequiredFields(['email']),
    async (req, res) => {
        const { email } = req.body;
        try {
            const result = await getVersions();
            triggerVersionMismatch(email, result.data['child-node']);
            console.log(result.data['child-node'])
            if (result.status) {

                return res.status(200).json({
                    success: true,
                    message: result.message,
                    data: result.data
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('Error in get-child-node-version endpoint:', error);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong while retrieving child-node version',
                error: error.message
            });
        }
    });

app.post('/get-block-status',  // after
    versionValidation,
    authenticateToken,
    validateRequiredFields(['email']),
    async (req, res) => {
        try {
            const { email } = req.body;

            // Check if user exists
            const userData = await getDocument("xmati-users", email);
            if (!userData) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: `User is ${userData.blocked ? 'blocked' : 'unblocked'}`,
                data: userData.blocked || false
            });

        } catch (error) {
            console.error('Error in set-block-status endpoint:', error);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong while updating user block status',
                error: error.message
            });
        }
    });

async function triggerVersionMismatch(userId, version) {
    try {
        // Send force block message using userId as clientId
        const success = wsManager.sendVersionStatus(userId, version);

        if (success) {
            return {
                success: true,
                message: `Force block signal sent to user ${userId} successfully`
            };
        } else {
            return {
                success: false,
                message: `User ${userId} not found or not connected via WebSocket`
            };
        }
    } catch (error) {
        console.error('Error triggering logout:', error);
        return {
            success: false,
            message: 'Failed to trigger logout',
            error: error.message
        };
    }
}

// not used
app.post('/save-bot',  // after
    versionValidation,

    decryptPayload,
    validateRequiredFields(['fullName', 'organizationName', 'key', 'data', 'from']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { fullName, organizationName, key, data, from } = req.body;

            var result = await saveBot(fullName, organizationName, key, data, from);
            if (!result) {
                return res.status(400).json({ status: false, error: 'Failed to save bot' });
            }
            return res.status(200).json({ status: true, message: 'Bot saved successfully' });
        } catch (error) {
            return res.status(500).json({ status: false, error: error || 'Something went wrong while saving the bot' });
        }
    });

// not used
app.post('/get-bots',  // after
    versionValidation,

    decryptPayload,
    validateRequiredFields(['email']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { email } = req.body;

            let result = await getFromMongoByPrefix("xmatibots", `${email}_`);
            if (!result) {
                return res.status(400).json({ status: false, error: 'Failed to get bot' });
            }

            return res.status(200).json({ status: true, message: 'Bots received successfully', data: result });
        } catch (error) {
            return res.status(500).json({ status: false, error: error || 'Something went wrong while getting the bot' });
        }
    });

// not used
app.get('/get-all-bots',  // after 
    versionValidation,

    async (req, res) => {
        try {

            let result = await getFromMongoByPrefix("xmatibots", '');
            if (!result) {
                return res.status(400).json({ status: false, error: 'Failed to get bot' });
            }

            return res.status(200).json({ status: true, message: 'Bots received successfully', data: result });
        } catch (error) {
            return res.status(500).json({ status: false, error: error || 'Something went wrong while getting the bot' });
        }
    });

// not used
app.post('/delete-bot',   // after
    versionValidation,

    decryptPayload,
    validateRequiredFields(['fullName', 'key']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { fullName, key } = req.body;

            let result = await deleteBot(fullName, key);
            if (!result) {
                return res.status(400).json({ status: false, error: 'Failed to delete bot' });
            }

            return res.status(200).json({ status: true, message: 'Bot deleted successfully', data: result });
        } catch (error) {
            return res.status(500).json({ status: false, error: error || 'Something went wrong while deleting the bot' });
        }
    });



// ################ Mother(Util) APIs################

app.post('/save-subscription',     // mother
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['key', 'name', 'subscription', 'duration', 'amount']),
    maintenanceValidation,
    async (req, res) => {
        const { key, name, subscription, duration, amount } = req.body;

        triggerLogout(key)
        let result = await SaveSubscription(key, name, subscription, duration, 0, amount, false)

        if (!result.status) {
            return res.status(400).json({ status: false, msg: result.msg || 'Failed to save subscription data' });
        }

        res.status(200).json({ status: true, msg: 'Subscription data saved successfully' });
    });

async function triggerLogout(userId) {
    try {
        // Send force logout message using userId as clientId
        const success = wsManager.sendForceLogout(userId);

        if (success) {
            return {
                success: true,
                message: `Force logout signal sent to user ${userId} successfully`
            };
        } else {
            return {
                success: false,
                message: `User ${userId} not found or not connected via WebSocket`
            };
        }
    } catch (error) {
        console.error('Error triggering logout:', error);
        return {
            success: false,
            message: 'Failed to trigger logout',
            error: error.message
        };
    }
}

app.post('/nextsub-upgrade',   // mother
    maintenanceValidation,
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['email', 'plan', 'duration', 'price']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { email, plan, duration, price, isDowngrade } = req.body;

            let result = await nextSubUpgrade(email, plan, duration, price, isDowngrade);

            if (result.success === true) {
                return res.status(200).json({ success: true, message: 'Subscription upgraded successfully' });
            }

            return res.status(400).json({ success: false, message: result.msg || 'Failed to upgrade subscription' });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ status: false, message: 'Something went wrong while upgrading the subscription inside users S3' });
        }
    });

app.post('/remove-nextsub',   // mother
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['email']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { email } = req.body;

            // Get data from "xmati-users" bucket
            let userData = await getDocument("xmati-users", `${email}`);

            // Clear nextSubs if it exists
            await clearNextSubs(email, userData);

            return res.status(200).json({ status: true, message: 'Next subscription removed successfully' });
        } catch (err) {
            console.error('Error in remove-nextsub:', err);
            return res.status(500).json({ status: false, message: 'Something went wrong while removing next subscription' });
        }
    });

app.get('/get-enquiries',   // mother
    authenticateToken,
    async (req, res) => {
        try {

            let result = await getEnquiry();

            if (result === false) {
                return res.status(400).json({
                    success: false,
                    msg: 'Failed to retrieve enquiries'
                });
            }

            return res.status(200).json({
                success: true,
                msg: 'Enquiries retrieved successfully',
                data: result,
            });
        } catch (error) {
            console.error('Error retrieving enquiries:', error);
            return res.status(500).json({
                success: false,
                msg: 'Something went wrong while retrieving enquiries'
            });
        }
    });

app.post('/set-maintenance',   // mother
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['status']),
    async (req, res) => {
        try {
            const { status } = req.body;

            // Save the maintenance status to S3
            await saveDocument("xmati-extra", "maintenance-status", JSON.stringify({ status }));
            triggerMaintenanceStatus('all', status);
            return res.status(200).json({ status: true, msg: 'Maintenance status updated successfully' });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ status: false, msg: 'Something went wrong while updating the maintenance status' });
        }
    });

app.post('/set-block-status',  // mother
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['email', 'status']),
    async (req, res) => {
        try {
            const { email, status } = req.body;

            // Validate status is boolean
            if (typeof status !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'Status must be a boolean value (true or false)'
                });
            }

            // Check if user exists
            const userData = await getDocument("xmati-users", email);
            if (!userData) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Update the user document with blocked status
            const updatedUserData = {
                ...userData,
                blocked: status
            };

            // Save the updated document
            const saveResult = await saveDocument("xmati-users", email, updatedUserData);

            if (!saveResult) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update user block status'
                });
            }

            // Trigger blocking/unblocking via WebSocket 
            try {
                await triggerBlock(email, status);
            } catch (blockError) {
                console.warn('Failed to trigger block for user:', blockError.message);
                // Don't fail the entire operation if block fails
            }

            return res.status(200).json({
                success: true,
                message: `User ${status ? 'blocked' : 'unblocked'} successfully`,
            });

        } catch (error) {
            console.error('Error in set-block-status endpoint:', error);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong while updating user block status',
                error: error.message
            });
        }
    });

async function triggerMaintenanceStatus(userId, status) {
    try {
        // Send force block message using userId as clientId
        const success = wsManager.sendMaintenanceStatus(userId, status);

        if (success) {
            return {
                success: true,
                message: `Force block signal sent to user ${userId} successfully`
            };
        } else {
            return {
                success: false,
                message: `User ${userId} not found or not connected via WebSocket`
            };
        }
    } catch (error) {
        console.error('Error triggering logout:', error);
        return {
            success: false,
            message: 'Failed to trigger logout',
            error: error.message
        };
    }
}

async function triggerBlock(userId, status) {
    try {
        // Send force block message using userId as clientId
        const success = wsManager.sendBlockStatus(userId, status);

        if (success) {
            return {
                success: true,
                message: `Force block signal sent to user ${userId} successfully`
            };
        } else {
            return {
                success: false,
                message: `User ${userId} not found or not connected via WebSocket`
            };
        }
    } catch (error) {
        console.error('Error triggering logout:', error);
        return {
            success: false,
            message: 'Failed to trigger logout',
            error: error.message
        };
    }
}

app.get('/get-all-users-subscriptions',  // mother

    async (req, res) => {
        try {
            // Fetch all user keys from the 'xmati-users' bucket
            const userKeys = await getFromMongoByPrefix('xmati-users', '');

            if (!userKeys || userKeys.length === 0) {
                return res.status(404).json({ success: false, message: 'No users found' });
            }

            const usersWithSubscriptions = [];

            for (const userKey of userKeys) {
                try {
                    // Fetch user data
                    const userDataStream = await getDocument('xmati-users', userKey.key);

                    // Fetch subscription data
                    const subscriptionDataStream = await getDocument('xmati-subscriber', userKey.key);


                    // Fetch bots for the user
                    const botKeys = await getFromMongoByPrefix('xmatibots', userKey.key);
                    const botsData = [];

                    for (const botKey of botKeys) {
                        try {
                            const id = botKey.key.split('_')[1]

                            botsData.push({
                                id: id,
                                name: id.split('-')[1],
                            });
                        } catch (botError) {
                            console.error(`Error processing bot key ${botKey.key}:`, botError.message);
                            continue; // Skip this bot and move to the next
                        }
                    }

                    // Remove unwanted keys from userData
                    // eslint-disable-next-line no-unused-vars
                    const { botIdList, filteredBots, numberOfBots, ...filteredUserData } = userDataStream;


                    // Combine user and subscription data
                    usersWithSubscriptions.push({
                        email: userKey.key, // Extract email from key
                        userData: filteredUserData,
                        subscriptionData: subscriptionDataStream,
                        botsData
                    });
                } catch (error) {
                    console.error(`Error processing user key ${userKey.key}:`, error.message);
                    continue; // Skip this user and move to the next
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Users and subscriptions retrieved successfully',
                data: usersWithSubscriptions,
            });
        } catch (error) {
            console.error('Error fetching users and subscriptions:', error.message);
            return res.status(500).json({ success: false, message: 'Something went wrong', error: error.message });
        }
    });

// app.post('/gemini-llm', async (req, res) => {
//     try {
//         const { prompt } = req.body;

//         const result = await generateText(prompt);

//         console.log(result.text());
//         res.status(200).json({
//             response: result.text()
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });


// app.post('/gemini-voice', upload.single('audio'), async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ error: 'No audio file received' });
//         }

//         // Configure audio settings (MUST match frontend recording settings)
//         const audioConfig = {
//             content: req.file.buffer.toString('base64'),
//         };

//         const config = {
//             encoding: 'WEBM_OPUS',
//             sampleRateHertz: 48000,
//             languageCode: 'en-US', // Single language fallback
//             //   alternativeLanguageCodes: [ // ✅ Plural parameter name
//             //     'en-US',    // English (US)
//             //     'es-ES',    // Spanish (Spain)
//             //     'fr-FR',    // French
//             //     'de-DE',    // German
//             //     'hi-IN',    // Hindi
//             //     'ja-JP',    // Japanese
//             //     'ko-KR',    // Korean
//             //     'zh-CN',    // Chinese (Simplified)
//             //     'ar-SA'     // Arabic
//             //   ],
//             // model: 'latest_long' // Required for long audio + multiple languages
//         };

//         // Use longRunningRecognize for audio > 1 minute
//         const [operation] = await client.longRunningRecognize({
//             audio: audioConfig,
//             config: config,
//         });

//         const [response] = await operation.promise();
//         const transcript = response.results
//             .map(result => result.alternatives[0].transcript)
//             .join('\n');

//         // Translate to English
//         const projectId = 'gen-lang-client-0617251816';
//         const [translation] = await translationClient.translateText({
//             parent: `projects/${projectId}/locations/global`,
//             contents: [transcript],
//             mimeType: 'text/plain',
//             sourceLanguageCode: 'auto', // Auto-detect source
//             targetLanguageCode: 'en-US'
//         });

//         res.json({ transcript: translation.translations[0].translatedText });

//     } catch (error) {
//         console.error('Speech API Error:', error);
//         res.status(500).json({
//             error: 'Speech recognition failed',
//             details: error.message
//         });
//     }
// });


// app.post('/gemini-voice', async (req, res) => {
//     try {
//         // Get the audio file from FormData
//         const audioFile = req.files.find(file => file.fieldname === 'audio');

//         if (!audioFile) {
//             return res.status(400).json({ error: 'No audio file uploaded' });
//         }

//         // Convert the audio buffer to base64
//         const audioContent = audioFile.buffer.toString('base64');

//         // Call Google Speech-to-Text
//         const result = await convertSpeechToText(audioContent);

//         res.status(200).json({
//             transcript: result
//         });
//     } catch (error) {
//         console.error('Server error:', error);
//         res.status(500).json({ 
//             error: error.message || 'Audio processing failed',
//             details: error.details // Google API error details if available
//         });
//     }
// });


app.post('/attach-payment-method', // mother 
    validateRequiredFields(['email', 'paymentMethodId', 'customerId']),
    maintenanceValidation,
    async (req, res) => {
        const { email, paymentMethodId, customerId } = req.body;

        try {
            // Get or create a Stripe customer
            let customer = null;
            if (customerId === '') {
                customer = await getOrCreateCustomerByEmail(email);
            } else {
                customer = customerId;
            }


            if (!customer) {
                return res.status(400).json({ success: false, msg: 'Failed to create or retrieve customer' });
            }

            if (paymentMethodId == '') {
                return res.status(400).json({ success: false, msg: 'Invalid payment method id' });
            }

            // Attach the payment method to the customer
            await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });

            // Set the payment method as the default for the customer
            await stripe.customers.update(customer.id, {
                invoice_settings: { default_payment_method: paymentMethodId },
            });

            return res.status(200).json({
                success: true,
                msg: 'Stripe customer created and payment method attached successfully',
                customerId: customer.id,
                paymentMethodId: paymentMethodId,
            });
        } catch (error) {
            console.error('Error with stripe:', error.message);
            return res.status(500).json({ success: false, msg: error.message });
        }
    });

app.post('/create-payment-intent',  // mother 
    validateRequiredFields(['amount', 'currency', 'customerId', 'paymentMethodId', 'email', 'subscription', 'duration']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { amount, currency, customerId, paymentMethodId, email, subscription, duration } = req.body; // Amount in cents (e.g., $10.00 = 1000)

            let response = await createPaymentIntent(amount, currency, customerId, paymentMethodId, email, subscription, duration);
            if (!response.success) {
                return res.status(400).send('something went wrong while getting payement intent')
            }

            return res.status(200).json({
                client_secret: response.data,
                card_data: response.card.cardDetails,
            });
        }
        catch (err) {
            return res.status(400).send('something went wrong' + err.message);
        }
    });

app.post('/refund-amount',  // mother
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['chargeId', 'reason', 'amount']),
    maintenanceValidation,
    async (req, res) => {
        const { chargeId, reason, amount } = req.body;

        try {
            const refundSuccess = await refundCharge(chargeId, reason, amount);
            if (!refundSuccess) {
                return res.status(400).json({ success: false, error: 'Failed to process refund' });
            }
            return res.status(200).json({ success: true, message: 'Refund processed successfully' });
        } catch (error) {
            console.error('Error processing refund:', error);
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

app.post('/failed-payment',   // mother
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['email', 'name', 'subscription', 'amount']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { email, name, subscription, amount } = req.body;

            // Prepare the email content
            const failedPaymentEmailTemplate = paymentFailedEmail(name, subscription, amount);

            // Send the email
            await sendEmail(email, null, null, failedPaymentEmailTemplate.subject, failedPaymentEmailTemplate.body);

            return res.status(200).json({ status: true, msg: 'Failed payment email sent successfully' });
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({ status: false, msg: 'Something went wrong while processing the failed payment email' });
        }
    });

app.post('/get-stripe-transactions',  // mother
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['email']),
    maintenanceValidation,
    async (req, res) => {
        const { email } = req.body

        try {
            const transactionData = await getStripeTransaction(email);
            if (!transactionData.status) {
                return res.status(404).json({ error: transactionData.error });
            }

            return res.status(200).json({ charges: transactionData.charges });
        } catch (err) {
            console.error(err);
            return res.status(400).json({ error: 'Failed to retrieve transactions' });
        }
    });

app.post('/trial-cancellation',   // mother
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['email']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { email } = req.body;

            let result = await trialCancellation(email);
            if (!result) {
                return res.status(400).json({ success: false, message: 'Failed to cancel after trial subscription' });
            }

            return res.status(200).json({ success: true, message: 'After Trial subscription cancelled successfully' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Something went wrong', error: err.message });
        }
    });

app.post('/downgrade-subscription',  // mother
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['email', 'fullName', 'currentSub', 'daysRemaining', 'amount']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { email, fullName, currentSub, daysRemaining, amount } = req.body;

            let response = await SaveSubscription(email, fullName, currentSub, 'custom', daysRemaining, amount, false);
            if (!response.status) {
                console.log('Failed to save subscription data:', response.msg);
                return res.status(400).json({ success: false, message: response.msg || 'Failed to save subscription data' });
            }

            return res.status(200).json({ success: true, message: 'Subscription downgraded successfully' });
        } catch (err) {
            console.error('Downgrading issue:', err.message);
            res.status(500).json({ success: false, message: err.message });
        }
    });

app.post('/cancel-subscription',  // mother
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['chargeId', 'reason', 'email', 'fullName', 'subscription', 'amount', 'refundDetails']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { chargeId, reason, email, fullName, subscription, amount, refundDetails } = req.body;

            triggerLogout(email)
            let result = await cancelSubscription(chargeId, reason, email, fullName, subscription, amount, refundDetails);
            if (!result) {
                return res.status(400).json({ success: false, message: 'Failed to cancel subscription' });
            }

            return res.status(200).json({
                success: true,
                refundDetails
            });
        } catch (err) {
            console.error('Cancellation error:', err.message);
            res.status(500).json({ success: false, message: err.message });
        }
    });

app.post('/download-csv',  // mother
    authenticateToken,
    decryptPayload,
    validateRequiredFields(['data', 'email']),
    maintenanceValidation,
    (req, res) => {
        try {
            const { data, email } = req.body;

            let result = downloadCSV(data, email, res);
            if (!result) {
                return res.status(400).json({ success: false, message: 'Failed to generate CSV' });
            }

            // res.status(200).send('success');
        } catch (err) {
            console.error(err);
            res.status(500).send('Failed to generate CSV');
        }
    });

app.post('/rollback-registration',  // mother

    validateRequiredFields(['email']),
    maintenanceValidation,
    async (req, res) => {
        try {
            const { email } = req.body;

            // Delete user data from xmati-users collection
            const userDeleteResult = await deleteFromMongo("xmati-users", email);

            // Delete subscription data from xmati-subscriber collection
            const subscriptionDeleteResult = await deleteFromMongo("xmati-subscriber", email);

            // Check if any data was deleted (successful rollback)
            if (userDeleteResult || subscriptionDeleteResult) {
                // Send email notification about registration revocation using template
                try {
                    const emailTemplate = registrationRollbackEmail(email);
                    await sendEmail(email, null, null, emailTemplate.subject, emailTemplate.body);
                    console.log(`Rollback notification email sent to: ${email}`);
                } catch (emailError) {
                    console.error('Failed to send rollback notification email:', emailError);
                    // Don't fail the entire operation if email fails
                }

                // Determine response message based on what was deleted
                let message = 'User registration rolled back successfully.';
                if (userDeleteResult && subscriptionDeleteResult) {
                    message = 'User registration rolled back successfully. Data deleted from both collections. Notification email sent.';
                } else if (userDeleteResult && !subscriptionDeleteResult) {
                    message = 'User data deleted from xmati-users. No subscription data found to delete. Notification email sent.';
                } else if (!userDeleteResult && subscriptionDeleteResult) {
                    message = 'Subscription data deleted from xmati-subscriber. No user data found to delete. Notification email sent.';
                }

                return res.status(200).json({
                    success: true,
                    message: message
                });
            } else {
                return res.status(200).json({
                    success: true,
                    message: 'No user data found in either collection for the provided email.'
                });
            }
        } catch (error) {
            console.error('Error during rollback registration:', error);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong while rolling back registration',
                error: error.message
            });
        }
    });



//cron job to send expiry email every day at 10:00 PM
cron.schedule('25 18 * * *', async () => {
    try {
        await sendExpiryEmail();
        console.log('Cron job executed successfully:');
    } catch (error) {
        console.error('Error executing cron job:', error.message);
    }
});

// cron job to auto-renew subscriptions every day at 11:55 PM
cron.schedule('55 23 * * *', async () => {
    try {
        await autoRenewSubscription();
        console.log('Cron job executed successfully:');
    } catch (error) {
        console.error('Error executing cron job:', error.message);
    }
}, { timezone: 'America/Los_Angeles' });


// Error handling middleware (should be last)
app.use(errorHandler);


// Specify the port and start the server
const PORT = 8000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
