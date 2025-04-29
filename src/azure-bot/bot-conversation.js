const axios = require("axios");
require('dotenv').config();

const azuredirectLineSecret = process.env.AZURE_DIRECTLINE_SECRET;

// Creates Conversation
async function startConversation(message, fromId, botName) {
    // Direct-Line secret of your bot is used for communication
    const directLineSecret = azuredirectLineSecret;
    const directLineUrl = "https://directline.botframework.com/v3/directline";
  
    try {
      // Start a new conversation
      const idResponse = await axios.post(`${directLineUrl}/conversations`, null, {
        headers: { Authorization: `Bearer ${directLineSecret}` },
      });
  
      const conversationId = idResponse.data.conversationId;
  
      // Send prompt to the Bot
      await axios.post(
        `${directLineUrl}/conversations/${conversationId}/activities`,
        {
          type: "message",
          from: { id: fromId },
          text: message,
        },
        {
          headers: { Authorization: `Bearer ${directLineSecret}` },
        }
      );
  
      // Receive response from the bot
      const response = await axios.get(
        `${directLineUrl}/conversations/${conversationId}/activities`,
        {
          headers: { Authorization: `Bearer ${directLineSecret}` },
        }
      );
  
      const messages = response.data.activities
        .filter((activity) => activity.from.id === botName)
        .map((activity) => activity.text);
  
      return messages[messages.length - 1];
    } catch (error) {
      console.error("Error in starting conversation:", error);
      throw new Error("Failed to start conversation.");
    }
  }

  module.exports = { startConversation };
  