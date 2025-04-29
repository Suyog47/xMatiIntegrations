"use strict";

const { LexRuntimeV2Client, RecognizeTextCommand } = require("@aws-sdk/client-lex-runtime-v2");
const s3Service = require("../../../utils/s3-service");
require('dotenv').config();

const awsAccessKeyId = process.env.AWS_ACCESS_KEY;
const awsSecretAccessKey = process.env.AWS_SECRET_KEY;

const lexRuntimeV2 = new LexRuntimeV2Client({
    region: 'us-east-1',
    credentials: {
        accessKeyId: awsSecretAccessKey,
        secretAccessKey: awsSecretAccessKey,
    },
});

// Replies to UserPrompts
async function startConvo(input, botId, apiUrl) {
    try {
        const params = {
            botId,
            botAliasId: 'TSTALIASID',
            localeId: 'en_US',
            sessionId: '123456',
            text: input,
            requestAttributes: {
                loyaltyLevel: 'Gold',
                preferredLanguage: 'en',
            }, // Optional: additional request attributes
        };

        const command = new RecognizeTextCommand(params);
        const response = await lexRuntimeV2.send(command);

        if (response.messages && response.messages.length > 0) {
            return response.messages[0]?.content; // Return messages if they exist
        }

        // Save the Intent name and status and check if the Intent is fulfilled
        const intentName = response.interpretations?.[0]?.intent?.name;
        const intentState = response.interpretations?.[0]?.intent?.state;

        if (intentName === "MakeAppointment" && intentState === "ReadyForFulfillment") {
            const slots = response.interpretations?.[0]?.intent?.slots;
            const slotValues = Object.entries(slots).reduce((acc, [slotName, slotDetails]) => {
                acc[slotName] = slotDetails?.value?.interpretedValue || null;
                return acc;
            }, {});

            const stringifiedSlot = JSON.stringify(slotValues);

            const res = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json", // Ensure the server expects JSON
                },
                body: stringifiedSlot,
            });

            const responseData = await res.json();
            return responseData["message"];
        }

        return "I am sorry, but I am only designed to assist with booking your appointment."; // Handle the case with no messages
    } catch (err) {
        console.log("Error:- ", err);
    }
}

// Get botId and apiUrl from S3
async function getDatafromS3(s3Key) {
    const content = await s3Service.getFromS3("bot-id-bucket", s3Key); // gets content from S3
    const data = await streamToString(content); // converts that content into text (botId)
    return data;
}

// Helper function to convert stream to string
function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        stream.on("error", reject);
    });
}

module.exports = { startConvo, getDatafromS3 };
