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
const { saveDocument, getDocument, getFromMongoByPrefix, deleteFromMongo, mongoKeyExists } = require("./utils/mongo-db");
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
const cors = require("cors");
// const path = require('path');
const app = express();
const http = require('http');
const { checkUser } = require('./src/authentication/check-user');
const WebSocketManager = require('./src/websocket/websocket-manager');
const { trialCancellation } = require('./src/subscription-services/trial-cancel');
const { createPaymentIntent, getOrCreateCustomerByEmail, getStripeTransaction, refundCharge, getCardDetails } = require('./src/payment-gateway/stripe');
const { authenticateToken, optionalAuth, generateToken } = require('./src/middleware/auth');
const { disableTimeout, errorHandler, validateRequiredFields } = require('./src/middleware/common');
const { versionValidation } = require('./src/middleware/version-validation');
const { getVersions } = require('./src/version/get-version');

require('dotenv').config();

// List of allowed origins
const allowedOrigins = [
    'https://www.app.xmati.ai',
    'https://app.xmati.ai',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5001',
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

// JWT middleware is available in ./src/middleware/auth.js
// Use authenticateToken for protected routes: app.get('/protected', authenticateToken, (req, res) => {})
// Use optionalAuth for routes where authentication is optional

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

// sample post - with version validation
app.post('/', versionValidation, (req, res) => {
    res.send('Hello, Express! Version validated successfully.');
});

// // Endpoint to create a Lex bot
// app.post('/lexbot', async (req, res) => {
//     try {
//         const { botName, apiUrl, template } = req.body;

//         const templateUrl = getTemplateFile(template.trim().replace(/ /g, "_"));
//         const id = generateRandomId(10);
//         const name = `${botName}-${id}`;
//         const ApiUrl = apiUrl;
//         await createBotReplica(name, templateUrl, ApiUrl);
//         return res.status(200).json({ message: 'Lex Bot Successfully Created!', botId: name });
//     }
//     catch (err) {
//         return res.status(400).json({ error: err });
//     }
// });


// // Endpoint to talk to Lex bot
// app.post('/lexbot/talk', async (req, res) => {
//     try {
//         const { input, botId } = req.body;
//         var data = await getDatafromS3(botId + ".txt");

//         var response = await startConvo(input, data.toString().split("-")[0], data.toString().split("-")[1]);    // sends the botId to start the convo with bot
//         return res.status(200).json({ message: response });
//     }
//     catch (err) {
//         return res.status(400).json({ error: err });
//     }
// });


// app.post('/azurebot', async () => {
//     const azureTenantId = process.env.AZURE_TENANT_ID;
//     const azureClientId = process.env.AZURE_CLIENT_ID;
//     const azureClientSecret = process.env.AZURE_CLIENT_SECRET;

//     const tenantId = azureTenantId;
//     const clientId = azureClientId; // Service Principal Client ID
//     const clientSecret = azureClientSecret; // Service Principal Client Secret

//     try {
//         const { botName, template } = req.body;

//         const templateUrl = getTemplateFile(template.trim().replace(/ /g, "_"));

//         // Authenticate using the Service Principal
//         const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

//         const id = generateRandomId(10);
//         const name = `${botName}-${id}`;           //name for the resources
//         await createAppRegistration(credential, name);

//         return res.status(200).json({ message: 'Azure Bot Successfully Created!', botId: name });
//     }
//     catch (err) {
//         return res.status(400).json({ error: err });
//     }
// });


// // Endpoint to talk to azure bot
// app.post('/azurebot/talk', async (req, res) => {
//     try {
//         const { input, botId } = req.body;
//         var data = await getDatafromS3(botId + ".txt");

//         var res = await startConversation(input, 'sampleId', data.toString().split("-")[0]);
//         return res.status(200).json({ message: response });
//     }
//     catch (err) {
//         return res.status(400).json({ error: err });
//     }
// });


// app.post('/oraclebot', async () => {
//     try {
//         const { botName, template } = req.body;

//         const id = generateRandomId(10);
//         const name = `${botName}-${id}`;           //name for the resources

//         await cloningDigitalAssistant(name);
//         return res.status(200).json({ message: 'Azure Bot Successfully Created!', botId: name });
//     }
//     catch (err) {
//         return res.status(400).json({ error: err });
//     }
// });


// // Endpoint to talk to azure bot
// app.post('/oraclebot/talk', async (req, res) => {
//     try {
//         const { input, botId } = req.body;

//         await sendUserPrompt(input);    // sends the botId to start the convo with bot
//         return res.status(200).json({ message: response });
//     }
//     catch (err) {
//         return res.status(400).json({ error: err });
//     }
// });


// telegram webhook endpoint
// app.post('/telegram/setwebhook', async (req, res) => {
//     try {
//         const { botToken, botId } = req.body;
//         var result = await setWebhook(botToken, botId);

//         if (result) {
//             return res.status(200).json({ message: 'Telegram Integrated Successfully' });
//         }
//         return res.status(400).json({ message: 'Something went wrong' });
//     }
//     catch (err) {
//         return res.status(400).json({ message: 'Something went wrong' });
//     }
// });



app.post('/mongo-save', versionValidation, async (req, res) => {
    const saveRes = await saveDocument("xmati-users", "user123", { name: "Alice", plan: "premium" });
    console.log("saveRes:", saveRes);

    res.status(200).json({ status: "ok", saveRes });
});

app.get('/mongo-get', versionValidation, async (req, res) => {
    const getRes = await getDocument("xmati-users", "user123");
    console.log("retrieved doc:", getRes);

    res.status(200).json({ status: "ok", getRes });
});

app.get('/mongo-delete', versionValidation, async (req, res) => {
    const deleteRes = await deleteFromMongo("xmati-users", "user123");
    console.log("deleteRes:", deleteRes);

    res.status(200).json({ status: "ok", deleteRes });
});

app.get('/mongo-key-exists', versionValidation, async (req, res) => {
    const keyExistsRes = await mongoKeyExists("xmati-users", "user123");
    console.log("keyExistsRes:", keyExistsRes);

    res.status(200).json({ status: "ok", keyExistsRes });
});

// Endpoint for user authentication through S3
app.post('/user-auth',
    versionValidation,
    optionalAuth,
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

                    // Generate JWT token with email
                    const token = generateToken(data.email);
                    dbData.token = token;
                }
            }

            if (from === "register") {
                const nextSubsData = data.nextSubs;

                result = await register(data.email, data);
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
                        response = await SaveSubscription(data.email, data.fullName, "Trial", "5d", 0, 0, false);
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

            // if (from === "updateBot") {
            //     // Send email notification for bot update
            //     status = 200;
            //     success = true;
            //     msg = "Bot updated successfully";
            //     dbData = {};
            //     const botUpdateEmailTemplate = botUpdateConfirmationEmail(data.fullName, data.botName, data.botDescription);
            //     sendEmail(data.email, null, null, botUpdateEmailTemplate.subject, botUpdateEmailTemplate.body);
            // }

            return res.status(status).json({ success, msg, dbData });
        }
        catch (err) {
            console.log(err);
            return res.status(400).json({ success: false, msg: "Something went wrong" });
        }
    });


app.post('/update-profile',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['data']),
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


app.post('/update-password',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['data']),
    async (req, res) => {
        try {
            const { data } = req.body;
            const email = req.user.email; // Get email from JWT token

            // Update user password
            let result = await updateUserPassOrProfile(email, data);

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


app.post('/update-card-info',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['email', 'customerId', 'paymentMethodId', 'data']),
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


app.post('/get-card-details',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['paymentMethodId']),
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


app.post('/send-email',
    versionValidation,
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


app.post('/save-subscription',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['key', 'name', 'subscription', 'duration', 'amount']),
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


app.post('/nextsub-upgrade',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['email', 'plan', 'duration', 'price']),
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


app.post('/remove-nextsub',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['email']),
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


app.post('/pro-suggestion-update',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['email', 'plan', 'duration', 'price']),
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


app.post('/get-subscription',
    versionValidation,
    optionalAuth,
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


app.post('/submit-enquiry',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['email', 'enquiry']),
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


app.get('/get-enquiries',
    versionValidation,
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


app.post('/get-user-enquiries',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['email']),
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


app.post('/set-maintenance',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['status']),
    async (req, res) => {
        try {
            const { status } = req.body;

            // Save the maintenance status to S3
            await saveDocument("xmati-extra", "maintenance-status", JSON.stringify({ status }));

            return res.status(200).json({ status: true, msg: 'Maintenance status updated successfully' });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ status: false, msg: 'Something went wrong while updating the maintenance status' });
        }
    });


app.get('/get-maintenance', versionValidation, async (req, res) => {
    let data = await getMaintenance();

    if (data.status) {
        return res.status(200).json({ status: true, msg: 'Maintenance status retrieved successfully', data: data.maintenance });
    }
    else {
        return res.status(500).json({ status: false, msg: 'Something went wrong while retrieving the maintenance status', data: true }); // by default keep it as true
    }
});


app.get('/get-all-users-subscriptions', versionValidation, optionalAuth, async (req, res) => {
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


app.post('/save-bot',
    versionValidation,
    optionalAuth,
    validateRequiredFields(['fullName', 'organizationName', 'key', 'data', 'from']),
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


app.post('/get-bots',
    versionValidation,
    optionalAuth,
    validateRequiredFields(['email']),
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


app.get('/get-all-bots', versionValidation, optionalAuth, async (req, res) => {
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


app.post('/delete-bot',
    versionValidation,
    optionalAuth,
    validateRequiredFields(['fullName', 'key']),
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


app.post('/check-user',
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


app.post('/send-email-otp',
    validateRequiredFields(['fullName', 'email', 'otp']),
    async (req, res) => {
        const { fullName, email, otp } = req.body;

        const emailTemplate = registrationEmailVerificationOtpEmail(fullName, otp);
        await sendEmail(email, null, null, emailTemplate.subject, emailTemplate.body);
        res.status(200).json({ status: true, message: 'OTP email sent successfully' });
    });


app.post('/forgot-pass',
    versionValidation,
    optionalAuth,
    validateRequiredFields(['email', 'password']),
    async (req, res) => {
        try {
            const { email, password } = req.body;

            let result = await forgotPass(email, password);
            if (!result) {
                return res.status(400).json({ status: false, msg: 'Failed to update password' });
            }

            return res.status(200).json({ status: true, msg: 'Password updated successfully' });
        } catch (error) {
            console.log(error);
            return res.status(500).send('Something went wrong while updating the password');
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



app.post('/attach-payment-method',
    versionValidation,
    validateRequiredFields(['email', 'paymentMethodId', 'customerId']),
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


app.post('/create-setup-intent',
    versionValidation,
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


app.post('/create-payment-intent',
    versionValidation,
    optionalAuth,
    validateRequiredFields(['amount', 'currency', 'customerId', 'paymentMethodId', 'email', 'subscription', 'duration']),
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

//     try {
//         const { clientSecret, cardDetails, subscription, duration, amount } = req.body;
//         let response = await makePayment(clientSecret, cardDetails, subscription, duration);

//         if (!response.success) {
//             return res.status(400).json({ success: false, error: response.error || 'Failed to make payment' });
//         }

//         return res.status(200).json({ success: true, message: 'Payment successful', paymentIntent: response.paymentIntent });
//     } catch (error) {
//         console.error('Error making payment:', error.message);
//         return res.status(500).json({ success: false, error: 'Failed to make payment' });
//     }
// });


// app.post('/create-stripe-subscription', async (req, res) => {
//     try {
//         const { customerId, subscription, duration } = req.body;

//         // Validate required fields
//         if (!customerId || !subscription || !duration) {
//             return res.status(400).json({ success: false, message: 'Customer ID, subscription, and duration are required' });
//         }

//         // Map subscription and duration to priceId
//         const priceKey = `STRIPE_${subscription.toUpperCase()}-${duration.toUpperCase()}`;
//         console.log('Price Key:', priceKey.trim());
//         const priceId = process.env[priceKey.trim()];

//         console.log('Creating subscription with priceId:', priceId);
//         if (!priceId) {
//             return res.status(400).json({ success: false, message: `Invalid subscription or duration: ${subscription}, ${duration}` });
//         }

//         // Create the subscription
//         const subscriptionResponse = await stripe.subscriptions.create({
//             customer: customerId,
//             items: [{ price: priceId }],
//             payment_behavior: 'default_incomplete',
//             metadata: {
//                 subscription,
//                 duration
//             },
//             expand: ['latest_invoice.payment_intent'], // Expand payment intent for additional details
//         });

//         if (!subscriptionResponse) {
//             return res.status(400).json({ success: false, message: 'Failed to create subscription' });
//         }

//         // Return subscription details
//         return res.status(200).json({
//             success: true,
//             subscriptionId: subscriptionResponse.id,
//         });
//     } catch (error) {
//         console.error('Error creating subscription:', error.message);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// });


app.post('/refund-amount',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['chargeId', 'reason', 'amount']),
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


app.post('/failed-payment',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['email', 'name', 'subscription', 'amount']),
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


app.post('/get-stripe-transactions',
    versionValidation,
    optionalAuth,
    validateRequiredFields(['email']),
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
    })


// function formatToISODate(date) {
//     const d = new Date(date)
//     const year = d.getFullYear()
//     const month = String(d.getMonth() + 1).padStart(2, '0') // 0-based
//     const day = String(d.getDate()).padStart(2, '0')

//     return `${year}-${month}-${day}`
// }

// function getMonthDifference(startDate, endDate) {
//     const start = new Date(startDate);
//     const end = new Date(endDate);
//     const years = end.getFullYear() - start.getFullYear();
//     const months = end.getMonth() - start.getMonth();
//     const totalMonths = years * 12 + months;

//     return totalMonths;
// }

// function calculateRefundDetails(startDate, expiryDate, totalAmount, subs) {
//     try {
//         const currentDate = new Date();
//         const start = new Date(formatToISODate(startDate));
//         const expiry = new Date(formatToISODate(expiryDate));

//         // Total number of months in the subscription
//         let totalMonths = getMonthDifference(start, expiry);

//         // Find the current cycle number (0-based)
//         let currentCycleStart = new Date(start);
//         let cycleNumber = 0;
//         while (currentCycleStart <= currentDate) {
//             const nextCycleStart = new Date(currentCycleStart);
//             nextCycleStart.setMonth(nextCycleStart.getMonth() + 1);

//             if (currentDate < nextCycleStart) {
//                 break;
//             }
//             currentCycleStart = nextCycleStart;
//             cycleNumber++;
//         }

//         const tentativeCycleEnd = new Date(currentCycleStart);
//         tentativeCycleEnd.setMonth(tentativeCycleEnd.getMonth() + 1);
//         const currentCycleEnd = tentativeCycleEnd > expiry ? expiry : tentativeCycleEnd;

//         // Remaining days in the current cycle
//         const msInDay = 1000 * 60 * 60 * 24;
//         const daysRemainingInCycle = Math.ceil((currentCycleEnd - currentDate) / msInDay);

//         // Full months remaining after the current cycle
//         const usedMonth = cycleNumber + 1
//         let remainingMonths = totalMonths - usedMonth; // +1 to exclude current cycle

//         // Refund only for full months remaining
//         const monthlyAmount = (subs === 'Professional') ? 100 : 18 //totalAmount / totalMonths
//         const usedAmount = usedMonth * monthlyAmount
//         const remainingAmount = totalAmount - usedAmount
//         const refundAmount = Math.max(0, remainingAmount)


//         return {
//             status: true,
//             daysRemainingInCycle,
//             remainingMonths,
//             refundAmount: refundAmount.toFixed(2),
//         };
//     } catch (error) {
//         console.error('Error calculating refund details:', error.message);
//         return { status: false, message: 'Failed to calculate refund details', error: error.message };
//     }
// }

//     const { email, cardDetails } = req.body;

//     try {
//         // Get or create a Stripe customer using the email
//         const customer = await getOrCreateCustomerByEmail(email);

//         if (!customer) {
//             return res.status(400).json({ success: false, message: 'Failed to create or retrieve customer' });
//         }

//         // Create a payment method
//         const paymentMethod = await stripe.paymentMethods.create({
//             type: 'card',
//             card: {
//                 number: cardDetails.number,
//                 exp_month: cardDetails.exp_month,
//                 exp_year: cardDetails.exp_year,
//                 cvc: cardDetails.cvc,
//             },
//         });

//         // Attach the payment method to the customer
//         await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });

//         // Set the payment method as the default for the customer
//         await stripe.customers.update(customer.id, {
//             invoice_settings: { default_payment_method: paymentMethod.id },
//         });

//         res.json({ success: true, customerId: customer.id, paymentMethodId: paymentMethod.id });
//     } catch (error) {
//         console.error('Error attaching payment method:', error.message);
//         res.status(500).json({ success: false, message: error.message });
//     }
// });


// Example usage in the refund API


app.post('/trial-cancellation',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['email']),
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


app.post('/downgrade-subscription',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['email', 'fullName', 'currentSub', 'daysRemaining', 'amount']),
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


app.post('/cancel-subscription',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['chargeId', 'reason', 'email', 'fullName', 'subscription', 'amount', 'refundDetails']),
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


app.post('/download-csv', versionValidation, authenticateToken, (req, res) => {
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


app.post('/rollback-registration',
    versionValidation,
    optionalAuth,
    validateRequiredFields(['email']),
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


app.get('/get-versions', optionalAuth, async (req, res) => {
    try {
        const result = await getVersions();

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


app.post('/set-block-status',
    versionValidation,
    authenticateToken,
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


// WebSocket API endpoints
app.get('/websocket/stats',
    versionValidation,
    optionalAuth,
    async (req, res) => {
        try {
            const stats = wsManager.getStats();
            return res.status(200).json({
                success: true,
                message: 'WebSocket stats retrieved successfully',
                data: stats
            });
        } catch (error) {
            console.error('Error getting WebSocket stats:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get WebSocket stats',
                error: error.message
            });
        }
    });


app.post('/websocket/send-message-to-user',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['userId', 'message']),
    async (req, res) => {
        try {
            const { userId, message } = req.body;

            const success = wsManager.sendMessageToUser(userId, message);

            if (success) {
                return res.status(200).json({
                    success: true,
                    message: `Message sent to user ${userId} successfully`
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: `User ${userId} not found or not connected`
                });
            }
        } catch (error) {
            console.error('Error sending message to user:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to send message to user',
                error: error.message
            });
        }
    });


app.post('/websocket/send-message-to-room',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['room', 'message']),
    async (req, res) => {
        try {
            const { room, message } = req.body;

            wsManager.sendMessageToRoom(room, message);

            return res.status(200).json({
                success: true,
                message: `Message sent to room ${room} successfully`
            });
        } catch (error) {
            console.error('Error sending message to room:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to send message to room',
                error: error.message
            });
        }
    });


app.post('/websocket/broadcast',
    versionValidation,
    authenticateToken,
    validateRequiredFields(['message']),
    async (req, res) => {
        try {
            const { message } = req.body;

            wsManager.broadcastToAll({
                type: 'server_broadcast',
                message: message,
                timestamp: new Date().toISOString()
            });

            return res.status(200).json({
                success: true,
                message: 'Broadcast message sent successfully'
            });
        } catch (error) {
            console.error('Error broadcasting message:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to broadcast message',
                error: error.message
            });
        }
    });


// function streamToString(stream) {
//     return new Promise((resolve, reject) => {
//         const chunks = [];
//         stream.on("data", (chunk) => chunks.push(chunk));
//         stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
//         stream.on("error", reject);
//     });
// }

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
