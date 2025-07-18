const express = require('express');
const cron = require('node-cron');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const { createBotReplica } = require('./src/amazon-lex/bot-functions/bot-replication');
const { startConvo, getDatafromS3 } = require('./src/amazon-lex/bot-functions/bot-conversation');
const { getTemplateFile, generateRandomId } = require('./utils/common-algo');
const { cloningDigitalAssistant } = require('./src/oracle-bot/bot-functions/bot-creation');
const { sendUserPrompt } = require('./src/oracle-bot/bot-functions/bot-conversation');
const { setWebhook } = require('./src/telegram/set-webhook');
const { login, register, updateUserPassOrProfile } = require('./src/user-auth/auth');
const { generateText, convertSpeechToText } = require('./src/gemini-llm/index');
// const { createPaymentIntent } = require('./src/payment-gateway/stripe');
const { sendEmail } = require('./utils/send-email');
const { saveToS3, getFromS3, getFromS3ByPrefix, deleteFromS3, keyExists } = require('./utils/s3-service');
const { format } = require('date-fns-tz');
const { welcomeSubscription,
    paymentReceiptEmail,
    paymentFailedEmail,
    renewalReminderEmail,
    profileUpdateConfirmationEmail,
    passwordChangeConfirmationEmail,
    paymentMethodUpdateConfirmationEmail,
    botCreationSuccessEmail,
    botDeletionConfirmationEmail,
    forgotPasswordOtpEmail,
    botNameUpdateEmail } = require('./templates/email_template');
const cors = require("cors");
const axios = require('axios');
const app = express();
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const { TranslationServiceClient } = require('@google-cloud/translate');
// const Queue = require('bull');
const http = require('http');

require('dotenv').config();
app.use(cors());

const server = http.createServer(app);

// Disable timeout at server level
server.timeout = 0;

//Disable timeout before any heavy middlewares
app.use((req, res, next) => {
    res.setTimeout(0);
    next();
});

const upload = multer({
    limits: {
        fileSize: 1024 * 1024 * 1024 // 1GB
    }
});

app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


const client = new SpeechClient({
    keyFilename: 'gemini-service-account.json'
    //projectId: 'gen-lang-client-0617251816' // Your GCP project ID
});
const translationClient = new TranslationServiceClient();

// sample get
app.get('/', (req, res) => {
    res.send('Hello, Express!');
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
app.post('/telegram/setwebhook', async (req, res) => {
    try {
        const { botToken, botId } = req.body;
        var result = await setWebhook(botToken, botId);

        if (result) {
            return res.status(200).json({ message: 'Telegram Integrated Successfully' });
        }
        return res.status(400).json({ message: 'Something went wrong' });
    }
    catch (err) {
        return res.status(400).json({ message: 'Something went wrong' });
    }
});


// Endpoint for user authentication through S3
app.post('/user-auth', async (req, res) => {
    try {
        const { data, from } = req.body;
        let result;
        let status;
        let success;
        let msg;
        let s3Data;

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
                s3Data = result;
            }
        }

        if (from === "register") {
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

                // Save trial subscription
                let response = await saveSubscriptionToS3(data.email, data.name, "Trial", "3d", 0, false);
                if (!response.status) {
                    status = 400;
                    success = false;
                    msg = response.msg || "Failed to save trial subscription";
                }
            }
            else {
                status = 400;
                success = false;
                msg = "Something went wrong";
            }
        }

        if (from === "updatePass" || from === "updateProfile" || from === "updatePayment") {
            result = await updateUserPassOrProfile(data.email, data);
            if (result === "success") {
                status = 200;
                success = true;
                msg = "User pass updated successfully";
            }
            else if (result === "not exist") {
                status = 400;
                success = false;
                msg = "User does not exist";
            }
            else {
                status = 400;
                success = false;
                msg = "Something went wrong";
            }

            if (from === "updateProfile") {
                // Send email notification for profile update
                const profileChangeEmailTemplate = profileUpdateConfirmationEmail(data.fullName);
                sendEmail(data.email, null, null, profileChangeEmailTemplate.subject, profileChangeEmailTemplate.body);
            }

            if (from === "updatePass") {
                // Send email notification for password change
                const passChangeEmailTemplate = passwordChangeConfirmationEmail(data.fullName);
                sendEmail(data.email, null, null, passChangeEmailTemplate.subject, passChangeEmailTemplate.body);
            }

            if (from === "updatePayment") {
                // Send email notification for payment card update
                const paymentMethodUpdateEmailTemplate = paymentMethodUpdateConfirmationEmail(data.fullName);
                sendEmail(data.email, null, null, paymentMethodUpdateEmailTemplate.subject, paymentMethodUpdateEmailTemplate.body);
            }
        }


        return res.status(status).json({ success, msg, s3Data });
    }
    catch (err) {
        console.log(err);
        return res.status(400).json({ success: false, msg: "Something went wrong" });
    }
});


app.post('/send-email', async (req, res) => {
    try {
        const { to, cc, bcc, subject, content } = req.body;

        let result = await sendEmail(to, cc, bcc, subject, content);
        if (!result) {
            return res.status(400).json({ status: false, error: 'Failed to send email' });
        }
        // Email sent successfully
        return res.status(200).json({ status: true, message: 'Email sent successfully!' });
    } catch (error) {
        return res.status(500).json({ status: false, error: 'Failed to send email' });
    }
});


app.post('/save-subscription', async (req, res) => {
    const { key, name, subscription, duration, amount } = req.body;
    let result = await saveSubscriptionToS3(key, name, subscription, duration, 0, amount, false)

    if (!result.status) {
        return res.status(400).json({ status: false, msg: result.msg || 'Failed to save subscription data' });
    }

    res.status(200).json({ status: true, msg: 'Subscription data saved successfully' });
});


async function saveSubscriptionToS3(key, name, subscription, duration, rdays = 0, amount, isCancelled = false) {
    try {
        const currentDate = new Date();
        let newDate;

        if (subscription === 'Trial') {
            let days = 1;

            if (duration === '15d') {
                // Add 15 days
                days = 15
            }
            else if (duration === '3d') {
                // Add 3 days
                days = 3
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


        let result = await saveToS3("xmati-subscriber", `${key}.txt`, JSON.stringify(data));
        if (!result) {
            return { status: false, msg: 'Failed to save user subscription' };
        }

        let normalizedNewDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        if (!isCancelled) {
            const emailTemplate = welcomeSubscription(name, subscription, duration, normalizedNewDate.toDateString());

            // Send welcome email
            sendEmail(key, null, null, emailTemplate.subject, emailTemplate.body);
        }

        // Send payment email
        if (subscription !== 'Trial') {
            const paymentEmailTemplate = paymentReceiptEmail(name, subscription, duration, amount, normalizedNewDate.toDateString());
            sendEmail(key, null, null, paymentEmailTemplate.subject, paymentEmailTemplate.body);
        }

        return { status: true };
    } catch (error) {
        return { status: false, msg: error.message || 'Something went wrong while saving the subscription' };
    }
}

app.post('/get-subscription', async (req, res) => {
    try {
        const { key } = req.body;

        let result = await getFromS3("xmati-subscriber", `${key}.txt`);
        let data = await streamToString(result);
        data = JSON.parse(data);
        if (!result) {
            return res.status(400).json({ status: false, msg: 'Failed to get user subscription' });
        }

        return res.status(200).json({ status: true, msg: 'User Subscription received successfully', data });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, msg: 'Something went wrong while getting the user subscription' });
    }
});

app.post('/set-maintenance', async (req, res) => {
    try {
        const { status } = req.body;

        // Save the maintenance status to S3
        await saveToS3("xmati-extra", "maintenance-status.txt", JSON.stringify({ status }));

        return res.status(200).json({ status: true, msg: 'Maintenance status updated successfully' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, msg: 'Something went wrong while updating the maintenance status' });
    }
});

app.get('/get-maintenance', async (req, res) => {
    let data = await getMaintenance();

    if (data.status) {
        return res.status(200).json({ status: true, msg: 'Maintenance status retrieved successfully', data: data.maintenance });
    }
    else {
        return res.status(500).json({ status: false, msg: 'Something went wrong while retrieving the maintenance status', data: true }); // by default keep it as true
    }
});

async function getMaintenance() {
    try {
        let data = await getFromS3("xmati-extra", `maintenance-status.txt`);

        if (!data) {
            return { status: false };
        }

        let mStatus = await streamToString(data);
        mStatus = JSON.parse(mStatus);

        return { status: true, maintenance: mStatus.status }
    }
    catch (error) {
        console.error('Error retrieving maintenance status:', error);
        return { status: false };
    }
}

app.post('/failed-payment', async (req, res) => {
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


app.post('/save-bot', async (req, res) => {
    try {
        const { fullName, organizationName, key, data, from } = req.body;


        let result = await saveToS3("xmatibots", key, JSON.stringify(data));
        if (!result) {
            return res.status(400).json({ status: false, error: 'Failed to save bot' });
        }

        let email = key.split('_')[0]
        let botName = (key.split('_')[1]).split('-')[1];

        if (from == 'user') {
            // Send email notification
            const botSuccessEmail = botCreationSuccessEmail(fullName, organizationName, botName);
            sendEmail(email, null, null, botSuccessEmail.subject, botSuccessEmail.body);
        }

        return res.status(200).json({ status: true, message: 'Bot saved successfully' });
    } catch (error) {
        return res.status(500).json({ status: false, error: 'Something went wrong while saving the bot' });
    }
});


app.post('/get-bots', async (req, res) => {
    try {
        const { email } = req.body;

        let result = await getFromS3ByPrefix("xmatibots", `${email}_`);
        if (!result) {
            return res.status(400).json({ status: false, error: 'Failed to get bot' });
        }

        return res.status(200).json({ status: true, message: 'Bots received successfully', data: result });
    } catch (error) {
        return res.status(500).json({ status: false, error: 'Something went wrong while getting the bot' });
    }
});

app.get('/get-all-bots', async (req, res) => {
    try {

        let result = await getFromS3ByPrefix("xmatibots", '');
        if (!result) {
            return res.status(400).json({ status: false, error: 'Failed to get bot' });
        }

        return res.status(200).json({ status: true, message: 'Bots received successfully', data: result });
    } catch (error) {
        return res.status(500).json({ status: false, error: 'Something went wrong while getting the bot' });
    }
});

app.post('/delete-bot', async (req, res) => {
    try {
        const { fullName, key } = req.body;

        let result = await deleteFromS3("xmatibots", key);
        if (!result) {
            return res.status(400).json({ status: false, error: 'Failed to delete bot' });
        }

        let email = key.split('_')[0]
        let botName = (key.split('_')[1]).split('-')[1];

        // Send email notification
        const botDeleteEmail = botDeletionConfirmationEmail(fullName, botName);
        sendEmail(email, null, null, botDeleteEmail.subject, botDeleteEmail.body);

        return res.status(200).json({ status: true, message: 'Bot deleted successfully', data: result });
    } catch (error) {
        return res.status(500).json({ status: false, error: 'Something went wrong while deleting the bot' });
    }
});


app.post('/check-user', async (req, res) => {
    try {
        const { email } = req.body;

        let result = await keyExists("xmati-users", `${email}.txt`);
        if (result) {
            // Generate a random 4-digit OTP
            const otp = Math.floor(1000 + Math.random() * 9000);

            // Send OTP email notification
            const forgotEmail = forgotPasswordOtpEmail(email, otp);
            sendEmail(email, null, null, forgotEmail.subject, forgotEmail.body);

            return res.status(200).json({ status: true, message: 'User exists', otp });
        } else {
            return res.status(400).json({ status: false, message: 'No User' });
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, error: 'Something went wrong while checking the user' });
    }
});


app.post('/forgot-pass', async (req, res) => {
    try {
        const { email, password } = req.body;

        const s3Content = await getFromS3("xmati-users", `${email}.txt`);
        let data = await streamToString(s3Content);
        data = JSON.parse(data);
        let updatedData = { ...data, password }

        await saveToS3(
            "xmati-users",
            `${email}.txt`,
            `${JSON.stringify(updatedData)}`
        );

        // Send confirmation email
        const passwordChangeEmailTemplate = passwordChangeConfirmationEmail(data.fullName);
        sendEmail(email, null, null, passwordChangeEmailTemplate.subject, passwordChangeEmailTemplate.body);

        res.status(200).send('Password updated');
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, error: 'Something went wrong while updating the password' });
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


async function getOrCreateCustomerByEmail(email) {
    try {

        const existingCustomers = await stripe.customers.list({
            email,
            limit: 1
        })

        if (existingCustomers.data.length > 0) {
            return existingCustomers.data[0]  // Reuse existing customer
        }

        // Create new one if not found
        return await stripe.customers.create({
            email,
            metadata: { guest: 'true' }
        })
    }
    catch (err) {
        console.log(err);
        return false;
    }
}

app.post('/create-stripe-customer', async (req, res) => {
    const { email, paymentMethodId } = req.body;

    try {
        // Get or create a Stripe customer
        const customer = await getOrCreateCustomerByEmail(email);

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
        console.error('Error creating Stripe customer:', error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});


app.post('/create-payment-intent', async (req, res) => {
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


async function getCardDetails(paymentMethodId) {
    try {
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

        if (!paymentMethod || paymentMethod.type !== 'card') {
            return { success: false, message: 'Invalid or non-card payment method' };
        }

        const cardDetails = {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year,
        };

        return { success: true, cardDetails };
    } catch (error) {
        console.error('Error retrieving card details:', error.message);
        return { success: false, message: error.message };
    }
}


async function createPaymentIntent(amount, currency, customerId, paymentMethodId, email, subscription, duration) {

    const customer = (customerId && Object.keys(customerId).length > 0)
        ? customerId
        : await getOrCreateCustomerByEmail(email);

    let response = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customer.id,
        payment_method: paymentMethodId,
        metadata: {
            email,
            subscription,
            duration
        },
        automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never', // Disable redirect-based payment methods
        },
        expand: ['charges'],
    })

    if (!response) {
        return { success: false };
    }
    else {
        // Get card details
        const cardDetailsResponse = await getCardDetails(paymentMethodId);
        return { success: true, data: response, card: cardDetailsResponse };
    }


}

// app.post('/make-payment', async (req, res) => {
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


async function makePayment(paymentIntentId, paymentMethodId) {
    const { error: paymentError, paymentIntent } = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
    });

    if (paymentError) {
        return { success: false, error: paymentError.message };
    }

    return { success: true, paymentIntent };
}


app.post('/create-stripe-subscription', async (req, res) => {
    try {
        const { customerId, subscription, duration } = req.body;

        // Validate required fields
        if (!customerId || !subscription || !duration) {
            return res.status(400).json({ success: false, message: 'Customer ID, subscription, and duration are required' });
        }

        // Map subscription and duration to priceId
        const priceKey = `STRIPE_${subscription.toUpperCase()}-${duration.toUpperCase()}`;
        console.log('Price Key:', priceKey.trim());
        const priceId = process.env[priceKey.trim()];

        console.log('Creating subscription with priceId:', priceId);
        if (!priceId) {
            return res.status(400).json({ success: false, message: `Invalid subscription or duration: ${subscription}, ${duration}` });
        }

        // Create the subscription
        const subscriptionResponse = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            metadata: {
                subscription,
                duration
            },
            expand: ['latest_invoice.payment_intent'], // Expand payment intent for additional details
        });

        if (!subscriptionResponse) {
            return res.status(400).json({ success: false, message: 'Failed to create subscription' });
        }

        // Return subscription details
        return res.status(200).json({
            success: true,
            subscriptionId: subscriptionResponse.id,
        });
    } catch (error) {
        console.error('Error creating subscription:', error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});


function calculateRefundDetails(startDate, expiryDate, totalAmount) {
    try {
        const currentDate = new Date();
        const start = new Date(startDate);
        const expiry = new Date(expiryDate);

        // Total number of months in the subscription
        let totalMonths = 0;
        let temp = new Date(start);
        while (temp < expiry) {
            totalMonths++;
            temp.setMonth(temp.getMonth() + 1);
        }

        // Find the current cycle number (0-based)
        let currentCycleStart = new Date(start);
        let cycleNumber = 0;
        while (currentCycleStart <= currentDate) {
            const nextCycleStart = new Date(currentCycleStart);
            nextCycleStart.setMonth(nextCycleStart.getMonth() + 1);

            if (currentDate < nextCycleStart) {
                break;
            }
            currentCycleStart = nextCycleStart;
            cycleNumber++;
        }

        const tentativeCycleEnd = new Date(currentCycleStart);
        tentativeCycleEnd.setMonth(tentativeCycleEnd.getMonth() + 1);
        const currentCycleEnd = tentativeCycleEnd > expiry ? expiry : tentativeCycleEnd;

        // Remaining days in the current cycle
        const msInDay = 1000 * 60 * 60 * 24;
        const daysRemainingInCycle = Math.ceil((currentCycleEnd - currentDate) / msInDay);

        // Full months remaining after the current cycle
        let remainingMonths = totalMonths - (cycleNumber + 1); // +1 to exclude current cycle

        // Monthly amount
        const monthlyAmount = totalAmount / totalMonths;

        // Refund only for full months remaining
        const refundAmount = remainingMonths * monthlyAmount;

        return {
            status: true,
            daysRemainingInCycle,
            remainingMonths,
            refundAmount: refundAmount.toFixed(2),
        };
    } catch (error) {
        console.error('Error calculating refund details:', error.message);
        return { status: false, message: 'Failed to calculate refund details', error: error.message };
    }
}

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


app.post('/cancel-subscription', async (req, res) => {
    try {
        const { chargeId, reason, email, fullName, subscription, amount, start, expiry } = req.body;

        // Convert amount to an integer
        const numericAmount = parseFloat(amount.replace(/^\$/, ''));

        // Calculate refund details
        const refundDetails = calculateRefundDetails(start, expiry, numericAmount);
        if (!refundDetails.status) {
            console.log('Refund calculation error:', refundDetails.message);
            return res.status(400).json({ success: false, message: refundDetails.message });
        }


        let response = await saveSubscriptionToS3(email, fullName, subscription, 'custom', refundDetails.daysRemainingInCycle, amount, true);
        if (!response.status) {
            console.log('Failed to save subscription data:', response.msg);
            return res.status(400).json({ success: false, message: response.msg || 'Failed to save subscription data' });
        }

        // refund the amount
        if (refundDetails.refundAmount > 0.00) {
            const refund = await stripe.refunds.create({
                charge: chargeId,
                amount: Math.round(refundDetails.refundAmount * 100), // Stripe expects the amount in cents
                reason: reason || 'requested_by_customer',
            });
        }

        return res.status(200).json({
            success: true,
            refundDetails
        });
    } catch (err) {
        console.error('Refund error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});


app.post('/get-stripe-transactions', async (req, res) => {
    const { email } = req.body

    try {
        const customers = await stripe.customers.list({ email, limit: 1 })
        if (!customers.data.length) {
            return res.status(404).json({ error: 'Customer not found' })
        }

        const customerId = customers.data[0].id

        // Get latest 100 charges
        const charges = await stripe.charges.list({
            customer: customerId,
            limit: 100,
            expand: ['data.refunds'],
        })

        return res.status(200).json({ charges: charges.data })
    } catch (err) {
        console.error(err)
        return res.status(400).json({ error: 'Failed to retrieve transactions' })
    }
})


// CSV download endpoint
app.post('/download-csv', (req, res) => {
    try {
        const { data, email } = req.body;

        if (!Array.isArray(data)) {
            return res.status(400).send('Expected an array of objects');
        }


        const fields = Object.keys(data[0])
        const parser = new Parser({ fields })
        const csv = parser.parse(data)

        // Save file temporarily
        const filePath = path.join(__dirname, `${email}-data.csv`);
        fs.writeFileSync(filePath, csv);

        // Use res.download to trigger download
        res.download(filePath, `${email}-data.csv`, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).send('Download failed');
            }

            // delete file after sending
            fs.unlinkSync(filePath);
        });

        // res.status(200).send('success');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to generate CSV');
    }
});


app.get('/send-expiry-email', async (req, res) => {
    try {
        // Retrieve all keys from the 'xmati-subscriber' bucket
        const keys = await getFromS3ByPrefix('xmati-subscriber');

        if (!keys || keys.length === 0) {
            return res.status(404).json({ status: false, message: 'No subscriptions found' });
        }

        const currentDate = new Date();
        // Normalize currentDate to midnight
        const normalizedCurrentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

        const expiryDetails = [];

        for (const key of keys) {
            try {
                const data = JSON.parse(key.data);

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

                if ([15, 7, 3, 1].includes(daysRemaining)) {
                    await emailDraftSend(key.key, data.name, data.subscription, daysRemaining, normalizedTillDate, data.amount);
                }
            } catch (error) {
                console.error(`Error processing key ${key.key}:`, error.message);
                continue; // Skip this key and move to the next
            }
        }

        return res.status(200).json({
            status: true,
            message: 'Expiry details retrieved successfully',
            data: expiryDetails
        });
    } catch (error) {
        console.error('Error in send-expiry-email:', error);
        return res.status(500).json({ status: false, message: 'Something went wrong', error: error.message });
    }
});

async function emailDraftSend(key, name, subscription, days, tillDate, amount) {
    try {
        const email = key.replace('.txt', '');
        const emailTemplate = renewalReminderEmail(name, subscription, tillDate.toDateString(), amount);
        await sendEmail(email, null, null, emailTemplate.subject, emailTemplate.body);
        console.log(`Email sent to ${email} about ${days} day(s) remaining.`);
    } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError.message);
    }
}

app.get('/auto-sub-renewal', async (req, res) => {
    try {
        // Retrieve all keys from the 'xmati-subscriber' bucket
        const keys = await getFromS3ByPrefix('xmati-subscriber');

        if (!keys || keys.length === 0) {
            return res.status(404).json({ status: false, message: 'No subscriptions found' });
        }

        const currentDate = new Date();
        const normalizedCurrentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

        for (const key of keys) {
            try {
                const data = JSON.parse(key.data);

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

                // Skip if subscription is "Trial"
                if (data.subscription === 'Trial' || data.isCancelled === true) {
                    console.log(`Skipping auto-renewal for key ${key.key}: Subscription is Trial or Cancelled.`);
                    continue;
                }

                // Compare normalizedTillDate with normalizedCurrentDate
                if (normalizedTillDate.getTime() === normalizedCurrentDate.getTime()) {

                    // Retrieve user data from 'xmati-users' bucket
                    const userKey = key.key;
                    let userData = await getFromS3('xmati-users', userKey);
                    userData = await streamToString(userData);

                    if (!userData) {
                        console.error(`User data not found for key ${userKey}`);
                        continue;
                    }

                    const parsedUserData = JSON.parse(userData);

                    // Validate customerId and paymentMethodId
                    const customerId = parsedUserData.stripeCustomerId;
                    const paymentMethodId = parsedUserData.stripePayementId;

                    if (!customerId || !paymentMethodId) {
                        console.error(`Missing customerId or paymentMethodId for key ${userKey}`);
                        continue;
                    }

                    // Extract numeric value from amount (e.g., "$18" -> 18)
                    const numericAmount = parseFloat(data.amount.replace(/^\$/, ''));
                    if (isNaN(numericAmount)) {
                        console.error(`Invalid amount format for key ${userKey}: ${data.amount}`);
                        continue;
                    }

                    // Create a payment intent
                    const paymentIntentResponse = await createPaymentIntent(
                        numericAmount * 100, // Convert amount to cents
                        'usd',
                        { id: customerId },
                        paymentMethodId,
                        userKey.replace('.txt', ''), // Extract email from key
                        data.subscription,
                        data.duration
                    );

                    if (!paymentIntentResponse.success) {
                        console.error(`Failed to create payment intent for key ${userKey}:`, paymentIntentResponse.error);
                        continue;
                    }

                    const clientSecret = paymentIntentResponse.data.id;

                    // Call the makePayment function
                    const paymentResponse = await makePayment(
                        clientSecret,
                        paymentMethodId,
                    );

                    if (!paymentResponse.success) {
                        console.error(`Failed to process payment for key ${key.key}:`, paymentResponse.error);

                        // Send the failed payment email
                        const failedPaymentEmailTemplate = paymentFailedEmail(data.name, data.subscription, data.amount);
                        sendEmail(email, null, null, failedPaymentEmailTemplate.subject, failedPaymentEmailTemplate.body);
                        continue;
                    }

                    // Call saveSubscriptionToS3 after successful payment
                    const saveSubscriptionResponse = await saveSubscriptionToS3(
                        userKey.replace('.txt', ''), // Email
                        data.name,
                        data.subscription,
                        data.duration,
                        0,
                        data.amount,
                        false // isCancelled flag
                    );

                    if (!saveSubscriptionResponse.status) {
                        console.error(`Failed to save subscription for key ${key.key}:`, saveSubscriptionResponse.msg);
                        continue;
                    }

                    console.log(`Payment and subscriotion save successful for key ${key.key}:`);
                }
            } catch (error) {
                console.error(`Error processing key ${key.key}:`, error.message);
                continue; // Skip this key and move to the next
            }
        }

        return res.status(200).json({ status: true, message: 'Auto-renewal process completed successfully' });
    } catch (error) {
        console.error('Error in auto-sub-renewal:', error);
        return res.status(500).json({ status: false, message: 'Something went wrong', error: error.message });
    }
});

function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        stream.on("error", reject);
    });
}


//cron job to send expiry email every day at 10 AM UTC
cron.schedule('0 0 10 * * *', async () => {
    try {
        const response = await axios.get('https://www.app.xmati.ai/apis/send-expiry-email');
        console.log('Cron job executed successfully:');
    } catch (error) {
        console.error('Error executing cron job:', error.message);
    }
});


// cron job to auto-renew subscriptions every day at 10 AM UTC
cron.schedule('21 17 * * *', async () => {
    try {
        await axios.get('http://localhost:8000/auto-sub-renewal');
        console.log('Cron job executed successfully:');
    } catch (error) {
        console.error('Error executing cron job:', error.message);
    }
});

// Specify the port and start the server
const PORT = 8000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
