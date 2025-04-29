"use strict";

const AWS = require('aws-sdk');
require('dotenv').config();

const awsAccessKeyId = process.env.AWS_ACCESS_KEY;
const awsSecretAccessKey = process.env.AWS_SECRET_KEY;

const lexModelsV2 = new AWS.LexModelsV2({
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: 'us-east-1'
});

let lexBotId;

/// Creates a bot from scratch
async function createBot(botName, botDesc, template) {
    try {
        const params = {
            botName: botName,
            description: botDesc,
            dataPrivacy: { childDirected: false },
            idleSessionTTLInSeconds: 300,
            roleArn: "arn:aws:iam::637423279997:role/aws-service-role/lexv2.amazonaws.com/AWSServiceRoleForLexV2Bots_3U1ATAHX1AC"
        };

        const response = await lexModelsV2.createBot(params).promise();
        if (response.botId) {
            lexBotId = response.botId;
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        await createBotLocale(lexBotId, template);
    } catch (error) {
        console.error('Error in createBot function call:', error);
    }
}

/// Creates botLocale language for Intent implementation
async function createBotLocale(botId, template) {
    try {
        const params = {
            botId: botId,
            botVersion: "DRAFT",
            localeId: "en_US",
            nluIntentConfidenceThreshold: 0.40
        };

        const response = await lexModelsV2.createBotLocale(params).promise();
        console.log("Bot Locale created:", response);

        await new Promise(resolve => setTimeout(resolve, 3000));
        await createBotIntent(botId, template);
    } catch (error) {
        console.error('Error in createBotLocale function call:', error);
    }
}

/// Creates Intent and Utterances for the bot
async function createBotIntent(botId, template) {
    let intent = "";
    let utterances = "";

    if (template == "Book flight") {
        intent = "flightIntent";
        utterances = "I want to book a flight?";
    } else {
        intent = "hotelIntent";
        utterances = "I want to book a hotel?";
    }

    try {
        const params = {
            botId: botId,
            botVersion: "DRAFT",
            localeId: "en_US",
            intentName: intent,
            sampleUtterances: [{ utterance: utterances }]
        };

        const response = await lexModelsV2.createIntent(params).promise();
        console.log("Intent created:", response);

        await new Promise(resolve => setTimeout(resolve, 3000));
        await createBotSlotType(botId, response.intentId, intent, utterances, template);
    } catch (error) {
        console.error('Error in createBotIntent function call:', error);
    }
}

/// Creates Slot Type for the Intent
async function createBotSlotType(botId, intentId, intentName, utterance, template) {
    try {
        const params = {
            slotTypeName: "confirmationSlotType",
            valueSelectionSetting: {
                resolutionStrategy: "OriginalValue"
            },
            botId: botId,
            botVersion: "DRAFT",
            localeId: "en_US",
            slotTypeValues: [
                {
                    sampleValue: {
                        value: "Yes"
                    },
                },
                {
                    sampleValue: {
                        value: "No"
                    },
                }
            ],
        };

        const response = await lexModelsV2.createSlotType(params).promise();
        await new Promise(resolve => setTimeout(resolve, 3000));
        await createBotSlot(botId, response.slotTypeId, intentId, intentName, utterance, template);
    } catch (error) {
        console.error('Error in createBotSlotType function call:', error);
    }
}

/// Creates Slot for the Intent
async function createBotSlot(botId, slotTypeId, intentId, intentName, utterance, template) {
    let slotName = "";
    let slotStatement = "";

    if (template == "Book flight") {
        slotName = "flightSlot";
        slotStatement = "Do you want to book a flight?";
    } else {
        slotName = "hotelSlot";
        slotStatement = "Do you want to book a hotel?";
    }

    try {
        const params = {
            slotName: slotName,
            slotTypeId: slotTypeId,
            botId: botId,
            botVersion: "DRAFT",
            localeId: "en_US",
            intentId: intentId,
            valueElicitationSetting: {
                slotConstraint: "Required",
                promptSpecification: {
                    messageGroups: [
                        {
                            message: {
                                plainTextMessage: {
                                    value: slotStatement
                                }
                            }
                        }
                    ],
                    maxRetries: 3,
                    allowInterrupt: true
                }
            }
        };

        const response = await lexModelsV2.createSlot(params).promise();
        console.log("Slot created:", response);

        await new Promise(resolve => setTimeout(resolve, 3000));
        await updateBotIntent(botId, intentId, intentName, utterance, response.slotId);
    } catch (error) {
        console.error('Error in createBotSlot function call:', error);
    }
}

/// Update Intent to set Slot priority
async function updateBotIntent(botId, intentId, intentName, utterance, slotId) {
    try {
        const params = {
            intentId: intentId,
            intentName: intentName,
            sampleUtterances: [{ utterance: utterance }],
            botId: botId,
            botVersion: "DRAFT",
            localeId: "en_US",
            slotPriorities: [
                {
                    priority: 0,
                    slotId: slotId
                }
            ]
        };

        const response = await lexModelsV2.updateIntent(params).promise();
        console.log("Intent updated:", response);

        await new Promise(resolve => setTimeout(resolve, 3000));
        await buildBot(botId);
    } catch (error) {
        console.error('Error in updateBotIntent function call:', error);
    }
}

/// Builds the bot
async function buildBot(botId) {
    try {
        const params = {
            botId: botId,
            botVersion: "DRAFT",
            localeId: "en_US",
        };

        await lexModelsV2.buildBotLocale(params).promise();
    } catch (error) {
        console.error('Error in building the bot:', error);
    }
}

module.exports = {
    createBot
};
