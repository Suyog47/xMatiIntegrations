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
const { createPaymentIntent } = require('./src/payment-gateway/stripe');
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


const client = new SpeechClient({
    keyFilename: 'gemini-service-account.json'
    //projectId: 'gen-lang-client-0617251816' // Your GCP project ID
});
const translationClient = new TranslationServiceClient();
//const emailQueue = new Queue('send-expiry-email');

// sample get
app.get('/', (req, res) => {
    res.send('Hello, Express!');
});


// Endpoint to create a Lex bot
app.post('/lexbot', async (req, res) => {
    try {
        const { botName, apiUrl, template } = req.body;

        const templateUrl = getTemplateFile(template.trim().replace(/ /g, "_"));
        const id = generateRandomId(10);
        const name = `${botName}-${id}`;
        const ApiUrl = apiUrl;
        await createBotReplica(name, templateUrl, ApiUrl);
        return res.status(200).json({ message: 'Lex Bot Successfully Created!', botId: name });
    }
    catch (err) {
        return res.status(400).json({ error: err });
    }
});


// Endpoint to talk to Lex bot
app.post('/lexbot/talk', async (req, res) => {
    try {
        const { input, botId } = req.body;
        var data = await getDatafromS3(botId + ".txt");

        var response = await startConvo(input, data.toString().split("-")[0], data.toString().split("-")[1]);    // sends the botId to start the convo with bot
        return res.status(200).json({ message: response });
    }
    catch (err) {
        return res.status(400).json({ error: err });
    }
});


app.post('/azurebot', async () => {
    const azureTenantId = process.env.AZURE_TENANT_ID;
    const azureClientId = process.env.AZURE_CLIENT_ID;
    const azureClientSecret = process.env.AZURE_CLIENT_SECRET;

    const tenantId = azureTenantId;
    const clientId = azureClientId; // Service Principal Client ID
    const clientSecret = azureClientSecret; // Service Principal Client Secret

    try {
        const { botName, template } = req.body;

        const templateUrl = getTemplateFile(template.trim().replace(/ /g, "_"));

        // Authenticate using the Service Principal
        const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

        const id = generateRandomId(10);
        const name = `${botName}-${id}`;           //name for the resources
        await createAppRegistration(credential, name);

        return res.status(200).json({ message: 'Azure Bot Successfully Created!', botId: name });
    }
    catch (err) {
        return res.status(400).json({ error: err });
    }
});


// Endpoint to talk to azure bot
app.post('/azurebot/talk', async (req, res) => {
    try {
        const { input, botId } = req.body;
        var data = await getDatafromS3(botId + ".txt");

        var res = await startConversation(input, 'sampleId', data.toString().split("-")[0]);
        return res.status(200).json({ message: response });
    }
    catch (err) {
        return res.status(400).json({ error: err });
    }
});


app.post('/oraclebot', async () => {
    try {
        const { botName, template } = req.body;

        const id = generateRandomId(10);
        const name = `${botName}-${id}`;           //name for the resources

        await cloningDigitalAssistant(name);
        return res.status(200).json({ message: 'Azure Bot Successfully Created!', botId: name });
    }
    catch (err) {
        return res.status(400).json({ error: err });
    }
});


// Endpoint to talk to azure bot
app.post('/oraclebot/talk', async (req, res) => {
    try {
        const { input, botId } = req.body;

        await sendUserPrompt(input);    // sends the botId to start the convo with bot
        return res.status(200).json({ message: response });
    }
    catch (err) {
        return res.status(400).json({ error: err });
    }
});


// Dummy post endpoint
app.post('/sample', async (req, res) => {
    res.status(200).json({ message: 'Called from client server:- Appointment booked successfully' });
});


// Telegram endpoint
app.get('/telegram', async (req, res) => {
    const update = req.body;

    // let result = await axios.post(`https://api.telegram.org/bot7328885090:AAHYDkmDwWRry6GfxBHNWEuba9Cjagc2NBA/sendMessage`, {
    //     chat_id: '5476355152',
    //     text: `You said: hello`,
    // });

    //let result = await axios.get(`https://api.telegram.org/bot7328885090:AAHYDkmDwWRry6GfxBHNWEuba9Cjagc2NBA/getMe`);

    let result = await axios.post(`https://api.telegram.org/bot7328885090:AAHYDkmDwWRry6GfxBHNWEuba9Cjagc2NBA/setWebhook`, {
        url: 'https://8ad3-120-138-97-166.ngrok-free.app/telegram',
    });

    res.status(200).json({ 'data': update.message });
});


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
                let response = await saveSubscriptionToS3(data.email, data.name, "Trial", "15d", 0);
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
    let result = await saveSubscriptionToS3(key, name, subscription, duration, amount, false)

    if (!result.status) {
        return res.status(400).json({ status: false, msg: result.msg || 'Failed to save subscription data' });
    }

    res.status(200).json({ status: true, msg: 'Subscription data saved successfully' });
});

async function saveSubscriptionToS3(key, name, subscription, duration, amount, isCancelled = false) {
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

            // Add 15 days
            newDate = new Date(new Date().setDate(currentDate.getDate() + days));
        } else {
            // Add 1 month
            if (duration === 'monthly') {
                newDate = new Date(new Date().setMonth(currentDate.getMonth() + 1));
            }
            else if (duration === 'half-yearly') {
                newDate = new Date(new Date().setMonth(currentDate.getMonth() + 6));
            }
            else if (duration === 'yearly') {
                newDate = new Date(new Date().setFullYear(currentDate.getFullYear() + 1));
            }
            else {
                return { status: false, msg: 'Invalid duration' };
            }
        }

        // const istCurrentDate = format(currentDate, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'Asia/Kolkata' });
        // const istNewDate = format(newDate, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'Asia/Kolkata' })

        const data = {
            name,
            subscription,
            createdAt: currentDate,
            till: newDate,
            duration,
            amount
        }


        let result = await saveToS3("xmati-subscriber", `${key}.txt`, JSON.stringify(data));
        if (!result) {
            return { status: false, msg: 'Failed to save user subscription' };
        }

        let normalizedNewDate
        if (!isCancelled) {
            normalizedNewDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
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


app.post('/gemini-llm', async (req, res) => {
    try {
        const { prompt } = req.body;

        const result = await generateText(prompt);

        console.log(result.text());
        res.status(200).json({
            response: result.text()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/gemini-voice', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file received' });
        }

        // Configure audio settings (MUST match frontend recording settings)
        const audioConfig = {
            content: req.file.buffer.toString('base64'),
        };

        const config = {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US', // Single language fallback
            //   alternativeLanguageCodes: [ // ✅ Plural parameter name
            //     'en-US',    // English (US)
            //     'es-ES',    // Spanish (Spain)
            //     'fr-FR',    // French
            //     'de-DE',    // German
            //     'hi-IN',    // Hindi
            //     'ja-JP',    // Japanese
            //     'ko-KR',    // Korean
            //     'zh-CN',    // Chinese (Simplified)
            //     'ar-SA'     // Arabic
            //   ],
            // model: 'latest_long' // Required for long audio + multiple languages
        };

        // Use longRunningRecognize for audio > 1 minute
        const [operation] = await client.longRunningRecognize({
            audio: audioConfig,
            config: config,
        });

        const [response] = await operation.promise();
        const transcript = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        // Translate to English
        const projectId = 'gen-lang-client-0617251816';
        const [translation] = await translationClient.translateText({
            parent: `projects/${projectId}/locations/global`,
            contents: [transcript],
            mimeType: 'text/plain',
            sourceLanguageCode: 'auto', // Auto-detect source
            targetLanguageCode: 'en-US'
        });

        console.log('Transcript:', transcript);
        console.log('Translation:', translation.translations[0].translatedText);

        res.json({ transcript: translation.translations[0].translatedText });

    } catch (error) {
        console.error('Speech API Error:', error);
        res.status(500).json({
            error: 'Speech recognition failed',
            details: error.message
        });
    }
});


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

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

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
    const { email } = req.body;

    let response = await getOrCreateCustomerByEmail(email);

    return res.status(200).send({ status: true, msg: "stripe customer created", data: response.id });
});

app.post('/create-payment-intent', async (req, res) => {
    const { amount, currency, customerId, email, subscription, duration } = req.body; // Amount in cents (e.g., $10.00 = 1000)

    const customer = (customerId && Object.keys(customerId).length > 0)
        ? customerId
        : await getOrCreateCustomerByEmail(email);

    let response = await await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customer.id,
        metadata: {
            email,
            subscription,
            duration
        },
        expand: ['charges'],
    })

    if (!response) {
        return res.status(400).send('something went wrong')
    }
    else {
        return res.status(200).json({
            client_secret: response
        });
    }
});


app.post('/refund', async (req, res) => {
    try {
        const { chargeId, reason, email, fullName } = req.body

        const refund = await stripe.refunds.create({
            charge: chargeId,
            reason: reason || 'requested_by_customer',
        })

        let response = await saveSubscriptionToS3(email, fullName, "Trial", "3d", 0, true);
        if (!response.status) {
            return res.status(400).json({ success: true, refund })
        }

        return res.status(200).json({ success: true, refund })
    } catch (err) {
        console.error('Refund error:', err)
        res.status(500).json({ success: false, error: err.message })
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
        return res.status(500).json({ error: 'Failed to retrieve transactions' })
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
                    // expiryDetails.push({
                    //     name: data.name,
                    //     key: key.key,
                    //     subscription: data.subscription,
                    //     till: normalizedTillDate.toISOString(), // Convert to string for JSON response
                    //     daysRemaining
                    // });

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


function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        stream.on("error", reject);
    });
}


// Schedule a task to run every hour
cron.schedule('0 0 10 * * *', async () => {
    try {
        const response = await axios.get('https://www.app.xmati.ai/apis/send-expiry-email');
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
