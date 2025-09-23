// "use strict";

// const axios = require("axios");

// async function setWebhook(botToken, botId) {
//     // First delete any existing webhook
//     await axios.post(`https://api.telegram.org/bot${botToken}/deleteWebhook`);

//      let result = await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
//             url: `https://bbf0-154-84-217-208.ngrok-free.app/api/v1/messaging/webhooks/${botId}/telegram`,
//         });

//         return result['data']['ok'];
// }

// module.exports = { setWebhook };