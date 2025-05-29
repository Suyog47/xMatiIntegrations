const express = require('express');
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
const cors = require("cors");
const axios = require('axios');
const app = express();
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const { TranslationServiceClient } = require('@google-cloud/translate');
require('dotenv').config();
app.use(cors()); // Allow all origins

const upload = multer({
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// increase the limit of the file size to be accepted from frontend 
app.use(express.json({ limit: '50mb' })); // Test with a higher limit
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const client = new SpeechClient({
    keyFilename: 'gemini-service-account.json'
    //projectId: 'gen-lang-client-0617251816' // Your GCP project ID
});
const translationClient = new TranslationServiceClient();

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
            }
            else {
                status = 400;
                success = false;
                msg = "Something went wrong";
            }
        }

        if (from === "updatePass" || from === "updateProfile") {
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
    try {
        const { key, subscription } = req.body;

        const currentDate = new Date();
        let newDate;
        if (subscription === 'trial') {
            // Add 15 days
            newDate = new Date(new Date().setDate(currentDate.getDate() + 15));
        } else {
            // Add 1 month
            newDate = new Date(new Date().setMonth(currentDate.getMonth() + 1));
        }

        //const istCurrentDate = format(currentDate, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'Asia/Kolkata' });
        //const istNewDate = format(newDate, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'Asia/Kolkata' })

        const data = {
            subscription: subscription,
            createdAt: currentDate,
            till: newDate
        }

        let result = await saveToS3("xmati-subscriber", `${key}.txt`, JSON.stringify(data));
        if (!result) {
            return res.status(400).json({ status: false, msg: 'Failed to save user subscription' });
        }

        return res.status(200).json({ status: true, msg: 'Subscription data saved successfully' });
    } catch (error) {
        return res.status(500).json({ status: false, msg: 'Something went wrong while saving the subscription' });
    }
});


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


app.post('/save-bot', async (req, res) => {
    try {
        const { key, data } = req.body;

        let result = await saveToS3("xmatibots", key, JSON.stringify(data));
        if (!result) {
            return res.status(400).json({ status: false, error: 'Failed to save bot' });
        }

        return res.status(200).json({ status: true, message: 'Bot saved successfully' });
    } catch (error) {
        return res.status(500).json({ status: false, error: 'Something went wrong while saving the bot' });
    }
});


app.post('/get-bots', async (req, res) => {
    try {
        const { email } = req.body;

        let result = await getFromS3ByPrefix("xmatibots", email);
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
        const { key } = req.body;

        let result = await deleteFromS3("xmatibots", key);
        if (!result) {
            return res.status(400).json({ status: false, error: 'Failed to delete bot' });
        }

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
            return res.status(400).json({ status: false, message: 'user exists' });
        } else {
            return res.status(200).json({ status: true, message: 'No User' });
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, error: 'Something went wrong while deleting the bot' });
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


app.post('/create-payment-intent', async (req, res) => {
    const { amount, currency } = req.body; // Amount in cents (e.g., $10.00 = 1000)

    let response = await createPaymentIntent(amount, currency);

    if (!response) {
        res.status(400).send('something went wrong')
    }
    else {
        res.status(200).json({
            client_secret: response
        });
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

// Specify the port and start the server
const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
