// const axios = require("axios");
// const { buildSignatureHeader } = require('../../../utils/build-signature');

// async function sendUserPrompt(prompt) {
//   const channelSecretKey = "YINPkbzjnuPu7qML5aKYwbc7o5Uxf5TN";

//   // Request body (the JSON message you're sending)
//   const messageToBot = {
//     userId: "abcd123",
//     profile: {
//       firstName: "Suyog",
//       lastName: "Amin",
//       age: 26,
//     },
//     messagePayload: {
//       type: "text",
//       text: prompt,
//     },
//   };

//   // Convert the message body to a JSON string and then to a Buffer (utf8 encoded)
//   const body = Buffer.from(JSON.stringify(messageToBot), "utf8");

//   // Generate the signature
//   const signature = buildSignatureHeader(body, channelSecretKey);

//   // Webhook URL (replace with your actual URL)
//   const webhookUrl =
//     "https://oda-6d4d12d78a3648ba8dde4d0804f967e0-da12.data.digitalassistant.oci.oraclecloud.com/connectors/v2/listeners/webhook/channels/2fb459ea-1d2a-4e39-9e9c-4784ddb0565a";

//   // Headers including the generated signature
//   const headers = {
//     "Content-Type": "application/json; charset=utf-8",
//     "X-Hub-Signature": signature, // Set the signature in the headers
//   };

//   try {
//     const response = await axios.post(webhookUrl, messageToBot, { headers });
//   } catch (error) {
//     console.error(
//       "Error:",
//       error.response ? error.response.data : error.message
//     );
//   }
// }

// module.exports = {
//   sendUserPrompt,
// };
