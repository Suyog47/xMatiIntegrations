const axios = require('axios');
const cheerio = require('cheerio');

async function getCleanContent(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Remove all unwanted elements completely
    $('script, style, nav, footer, header, aside, iframe, img, form, button, input, select, textarea').remove();

    // Get the main content area
    let contentElement = $('main, article, .content, .post-content, .entry-content');

    // If no specific content container found, use body but remove common non-content elements
    if (!contentElement.length) {
      contentElement = $('body');
      contentElement.find('header, footer, nav, aside').remove();
    }

    // Get clean text content
    const cleanText = contentElement.text()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();
    return cleanText;

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function convertToBotpressFormat(qnaResponse) {
  try {
    // Parse the QnA string to JSON
    const qnaData = typeof qnaResponse === 'string' ? JSON.parse(qnaResponse) : qnaResponse;

    if (!qnaData.qnas || !Array.isArray(qnaData.qnas)) {
      throw new Error('Invalid QnA format: qnas array not found');
    }

    const botpressQnA = {
      qnas: qnaData.qnas.map((item) => {
        // Generate random ID similar to your format
        const randomStr = Math.random().toString(36).substring(2, 12);
        const slug = item.questions[0].toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/(^_+|_+$)/g, '')
          .substring(0, 20);

        const allQuestions = Array.isArray(item.questions)
          ? item.questions
          : [item.questions];

        return {
          id: `${randomStr}_${slug}`,
          data: {
            action: "text",
            contexts: ["global"],
            enabled: true,
            answers: {
              en: [item.answer]
            },
            questions: {
              en: allQuestions
            },
            redirectFlow: "",
            redirectNode: ""
          }
        };
      }),
      contentElements: []
    };

    return botpressQnA;
  } catch (error) {
    console.error('Error converting to Botpress format:', error);
    return null;
  }
}

module.exports = { getCleanContent, convertToBotpressFormat };