const axios = require('axios');

const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_API_KEY;
const API_URL = "https://router.huggingface.co/v1/chat/completions";

/**
 * Send a message to Hugging Face conversational AI model using Chat Completions API
 * @param {string} message - The user's message to send to the AI
 * @param {object} options - Optional parameters for the API call
 * @returns {Promise<object>} - The AI response
 */

const prompt = (content) => `TASK: Extract 12 Question-Answer pairs from the content below.

CONTENT:
${content}

INSTRUCTIONS:
- Create natural questions that users would ask and 
- Answers should be concise (max 3 sentences)
- Focus on the most important information
- Return ONLY valid JSON

JSON FORMAT:
{
  "qnas": [
    {
      "question": "What is the main service?",
      "answer": "The main service is..."
    }
  ]
}

OUTPUT ONLY JSON:`

// Add a safety limit based on your testing
const MAX_CONTENT_LENGTH = 20000; // chars (~10000 tokens, leaving room for output)

async function sendMessage(message, options = {}) {
    // Warn if content is very large
    if (message.length > MAX_CONTENT_LENGTH) {
        console.warn(`⚠️ Content length (${message.length}) exceeds recommended limit (${MAX_CONTENT_LENGTH}). Truncating...`);
        message = message.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated for processing]';
    }

    const payload = {
        model: options.model || "Qwen/Qwen2.5-72B-Instruct",
        messages: [
            {
                role: "user",
                content: prompt(message)
            }
        ],
        max_tokens: options.maxTokens || 10000,
        temperature: options.temperature || 0.3,
        // top_p: options.topP || 0.95,
        stream: false
    };
    
    try {
        const response = await axios.post(API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 second timeout
        });

        return {
            success: true,
            //data: response.data,
            message: response.data.choices[0].message.content,
            // model: response.data.model,
            // usage: response.data.usage
        };
    } catch (error) {
        console.error('Hugging Face API Error:', error.response?.data || error.message);
        
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            details: error.response?.data,
            statusCode: error.response?.status
        };
    }
}

/**
 * Send a conversational message with message history support
 * @param {Array} messages - Array of message objects with role and content
 * @param {object} options - Optional parameters for the API call
 * @returns {Promise<object>} - The AI response
 */
async function sendConversationalMessage(messages, options = {}) {
    // If messages is a string, convert it to proper format
    if (typeof messages === 'string') {
        messages = [{ role: 'user', content: messages }];
    }
    
    const payload = {
        model: options.model || "meta-llama/Llama-3.2-3B-Instruct",
        messages: messages,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.8,
        top_p: options.topP || 0.95,
        stream: false
    };
    
    try {
        const response = await axios.post(API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        return {
            success: true,
            data: response.data,
            reply: response.data.choices[0].message.content,
            model: response.data.model,
            usage: response.data.usage
        };
    } catch (error) {
        console.error('Hugging Face Conversational API Error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            details: error.response?.data,
            statusCode: error.response?.status
        };
    }
}

/**
 * List available models
 * @returns {Promise<object>} - Available models list
 */
async function listAvailableModels() {
    const availableModels = [
        "meta-llama/Llama-3.2-3B-Instruct",
        "meta-llama/Llama-3.2-1B-Instruct", 
        "mistralai/Mistral-7B-Instruct-v0.3",
        "microsoft/Phi-3.5-mini-instruct",
        "Qwen/Qwen2.5-72B-Instruct"
    ];
    
    return {
        success: true,
        models: availableModels,
        note: "These are free models available through Hugging Face Router API"
    };
}

module.exports = {
    sendMessage,
    sendConversationalMessage,
    listAvailableModels
};
