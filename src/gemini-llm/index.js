const { GoogleGenerativeAI } = require('@google/generative-ai');


const genAI = new GoogleGenerativeAI('AIzaSyDDerixB_bKH7Oc8pl6JWsmWWZOoZg3ZM8');


async function generateText(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
       
        const result = await model.generateContent(prompt);
        const response = result.response;
        
        return response;
      } catch (error) {
        return error;
      }
}

module.exports = { generateText }