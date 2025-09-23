// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { SpeechClient } = require('@google-cloud/speech');

// const genAI = new GoogleGenerativeAI('AIzaSyDDerixB_bKH7Oc8pl6JWsmWWZOoZg3ZM8');

// // Explicit credentials setup
// const client = new SpeechClient({
//   keyFilename: 'gemini-service-account.json',
//   projectId: 'gen-lang-client-0617251816' // Your GCP project ID
// });

// async function generateText(prompt) {
//     try {
//         const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
       
//         const result = await model.generateContent(prompt);
//         const response = result.response;
        
//         return response;
//       } catch (error) {
//         return error;
//       }
// }


// async function convertSpeechToText(audioData) {
//   const response = await fetch(
//     `https://speech.googleapis.com/v1/speech:recognize?key=AIzaSyDDerixB_bKH7Oc8pl6JWsmWWZOoZg3ZM8`,
//     {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         config: { encoding: 'WEBM_OPUS', sampleRateHertz: 48000, languageCode: 'en-US' },
//         audio: { content: Buffer.from(audioData).toString('base64') }
//       })
//     }
//   )

//   const data = await response.json();
//   console.log(data);
//   return data.results[0].alternatives[0].transcript;
// }
// module.exports = { generateText, convertSpeechToText }