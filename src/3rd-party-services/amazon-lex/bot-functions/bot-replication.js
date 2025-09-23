// "use strict";

// const AWS = require("aws-sdk");
// const { Readable } = require("stream");
// const s3Service = require("../../../../utils/s3-service");
// require('dotenv').config();

// const awsAccessKeyId = process.env.AWS_ACCESS_KEY;
// const awsSecretAccessKey = process.env.AWS_SECRET_KEY;

// const lexModelsV2 = new AWS.LexModelsV2({
//     accessKeyId: awsAccessKeyId,
//     secretAccessKey: awsSecretAccessKey,
//     region: 'us-east-1'
// });

// // Creates an upload URL, retrieves the .zip template file from S3, and converts it into a buffer
// async function createBotReplica(botName, templateFileName, apiUrl) {
//     try {
//         const { importId, uploadUrl } = await lexModelsV2.createUploadUrl().promise();
//         const s3Content = await s3Service.getFromS3("mylexbotbucket", templateFileName);
//         const buffer = await streamToBuffer(Readable.from(s3Content));

//         await importBot(uploadUrl, importId, botName, buffer, apiUrl);
//     } catch (error) {
//         console.error("Error in createBotReplica:", error);
//     }
// }

// // Converts a readable stream to a buffer
// async function streamToBuffer(readableStream) {
//     const chunks = [];
//     for await (const chunk of readableStream) {
//         chunks.push(chunk);
//     }
//     return Buffer.concat(chunks);
// }

// // Sends the buffer file to the upload URL and imports it into AWS Lex
// async function importBot(uploadUrl, importId, botName, buffer, apiUrl) {
//     try {
//         await fetch(uploadUrl, {
//             method: "PUT",
//             headers: { "Content-Type": "application/zip" },
//             body: buffer,
//         });

//         const importParams = {
//             importId,
//             mergeStrategy: "FailOnConflict",
//             resourceSpecification: {
//                 botImportSpecification: {
//                     botName,
//                     dataPrivacy: { childDirected: false },
//                     idleSessionTTLInSeconds: 3600,
//                     roleArn: 'arn:aws:iam::637423279997:role/aws-service-role/lexv2.amazonaws.com/AWSServiceRoleForLexV2Bots_3U1ATAHX1AC',
//                 },
//             },
//         };

//         await lexModelsV2.startImport(importParams).promise();
//         await new Promise(resolve => setTimeout(resolve, 2000));
//         await getReplicatedBotId(botName, importId, apiUrl);
//     } catch (error) {
//         console.error("Error in importBot:", error);
//     }
// }

// // Retrieves the replicated bot's ID
// async function getReplicatedBotId(botName, importId, apiUrl) {
//     try {
//         const { importedResourceId } = await lexModelsV2.describeImport({ importId }).promise();

//         await s3Service.saveToS3(
//             "bot-id-bucket",
//             `${botName}.txt`,
//             `${importedResourceId}-${apiUrl}`
//         );

//         await new Promise(resolve => setTimeout(resolve, 2000));
//         await buildBot(importedResourceId);
//     } catch (error) {
//         console.error("Error in getReplicatedBotId:", error);
//     }
// }

// // Builds the bot
// async function buildBot(botId) {
//     try {
//         const buildParams = {
//             botId,
//             botVersion: "DRAFT",
//             localeId: "en_US",
//         };

//         await lexModelsV2.buildBotLocale(buildParams).promise();
//     } catch (error) {
//         console.error("Error in buildBot:", error);
//     }
// }

// module.exports = { createBotReplica };
