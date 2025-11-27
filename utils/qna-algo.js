const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

class GenericQnAScraper {
  constructor() {
    this.qnas = [];
    this.questionWords = new Set([
      'what', 'who', 'where', 'when', 'why', 'how', 'can', 'could', 'would', 
      'should', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'have', 'has',
      'will', 'shall', 'may', 'might', 'which', 'whom', 'whose'
    ]);
  }

  generateId(text) {
    const randomStr = Math.random().toString(36).substring(2, 12);
    const slug = text.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_+|_+$)/g, '')
      .substring(0, 20);
    return `${randomStr}_${slug}`;
  }

  // Check if text contains a question
  isQuestion(text) {
    const cleanText = text.trim();
    
    // Ends with question mark
    if (cleanText.endsWith('?')) return true;
    
    // Starts with question word
    const firstWord = cleanText.toLowerCase().split(' ')[0];
    if (this.questionWords.has(firstWord)) return true;
    
    return false;
  }

  // Extract actual questions from content
  extractExistingQuestions(content) {
    const questions = [];
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const cleanSentence = sentence.trim();
      if (cleanSentence && this.isQuestion(cleanSentence)) {
        questions.push(cleanSentence + (cleanSentence.endsWith('?') ? '' : '?'));
      }
    }
    
    return questions;
  }

  // Generate meaningful questions from statements
  // generateQuestionsFromStatement(statement, maxQuestions = 3) {
  //   const questions = [];
  //   const cleanStatement = statement.replace(/[.!?]+$/, '').trim();
    
  //   if (cleanStatement.length < 10 || cleanStatement.length > 200) {
  //     return questions;
  //   }

  //   const words = cleanStatement.split(' ');
    
  //   // Skip if it's already a question
  //   if (this.isQuestion(cleanStatement)) {
  //     return [cleanStatement + (cleanStatement.endsWith('?') ? '' : '?')];
  //   }

  //   // Strategy 1: Use the core noun phrase as "What is X?"
  //   if (words.length >= 3) {
  //     const nounPhrase = this.extractNounPhrase(cleanStatement);
  //     if (nounPhrase && nounPhrase.length > 5) {
  //       questions.push(`What is ${nounPhrase}?`);
  //     }
  //   }

  //   // Strategy 2: For "You can X" patterns
  //   if (cleanStatement.toLowerCase().startsWith('you can')) {
  //     const rest = cleanStatement.substring(8); // Remove "You can "
  //     if (rest.length > 10) {
  //       questions.push(`How can I ${rest}?`);
  //       questions.push(`Can I ${rest}?`);
  //     }
  //   }

  //   // Strategy 3: For "We offer X" patterns
  //   if (cleanStatement.toLowerCase().startsWith('we offer') || 
  //       cleanStatement.toLowerCase().startsWith('we provide')) {
  //     const rest = cleanStatement.substring(cleanStatement.indexOf(' ') + 1);
  //     questions.push(`What ${rest}?`);
  //   }

  //   // Strategy 4: Generic question based on statement type
  //   if (questions.length === 0) {
  //     if (this.containsActionWords(cleanStatement)) {
  //       questions.push(`How does ${this.extractMainTopic(cleanStatement)} work?`);
  //     } else {
  //       questions.push(`What is ${this.extractMainTopic(cleanStatement)}?`);
  //     }
  //   }

  //   return questions.slice(0, maxQuestions).filter(q => this.isGoodQuestion(q));
  // }

  // Extract the main topic from a sentence
  extractMainTopic(sentence) {
    // Remove common introductory phrases
    let cleaned = sentence
      .replace(/^(the|a|an|this|that|these|those|our|your|my|you can|we offer|we provide|it is|there is)\s+/i, '')
      .trim();
    
    // Take first 3-6 words as topic
    const words = cleaned.split(' ').slice(0, 6);
    
    // Remove trailing verbs or incomplete phrases
    let topic = words.join(' ');
    topic = topic.replace(/\s+(can|will|should|may|might|would|could|is|are|was|were|do|does|did|have|has)$/i, '');
    
    return topic.trim() || cleaned.split(' ').slice(0, 3).join(' ');
  }

  // Extract noun phrase (simplified)
  extractNounPhrase(sentence) {
    const words = sentence.split(' ');
    // Take first 2-4 words as potential noun phrase
    return words.slice(0, Math.min(4, words.length)).join(' ');
  }

  // Check if sentence contains action words
  containsActionWords(sentence) {
    const actionWords = ['work', 'create', 'build', 'make', 'do', 'use', 'get', 'achieve', 'complete', 'process'];
    const lowerSentence = sentence.toLowerCase();
    return actionWords.some(word => lowerSentence.includes(word));
  }

  // Validate if it's a good question
  isGoodQuestion(question) {
    if (!question || question.length < 8 || question.length > 150) return false;
    
    const qLower = question.toLowerCase();
    
    // Avoid questions that are too vague
    if (qLower.startsWith('what is the') && question.length < 20) return false;
    if (qLower.startsWith('tell me about') && question.length < 25) return false;
    
    // Should end with question mark
    if (!qLower.endsWith('?')) return false;
    
    // Should not be a fragment
    const words = question.split(' ');
    if (words.length < 3) return false;
    
    return true;
  }

  // Check if question is just a fragment of the answer
  isQuestionFragment(question, answer) {
    const cleanQuestion = question.toLowerCase().replace(/\?/g, '').trim();
    const cleanAnswer = answer.toLowerCase();
    
    // If question appears verbatim in answer (and it's substantial), it's probably a fragment
    if (cleanAnswer.includes(cleanQuestion) && cleanQuestion.length > 20) {
      return true;
    }
    
    return false;
  }

  // Main scraping function
  async scrapePage(url, pageType = 'generic') {
    try {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $('script, style, nav, footer, header, .nav, .footer, .header').remove();

      const content = $('main, .content, .container, article, body').first();
      
      // Process by sections (headings and their content)
      content.find('h1, h2, h3, h4, h5, h6').each((index, element) => {
        const $heading = $(element);
        const headingText = $heading.text().trim();
        
        if (headingText && headingText.length > 3 && headingText.length < 150) {
          let contentText = '';
          let nextElement = $heading.next();
          
          // Collect content until next heading
          while (nextElement.length && !nextElement.is('h1, h2, h3, h4, h5, h6')) {
            const text = nextElement.text().trim();
            if (text && (nextElement.is('p, div, li, span') || text.length > 20)) {
              contentText += text + ' ';
            }
            nextElement = nextElement.next();
          }
          
          contentText = contentText.trim();
          if (contentText && contentText.length > 20) {
            this.processSection(headingText, contentText, pageType);
          }
        }
      });

      // Also process standalone paragraphs that might contain Q&A
      this.processParagraphs(content, pageType, $);

      return this.getFormattedJSON();
    } catch (error) {
      console.error('Error scraping page:', error.message);
      throw error;
    }
  }

  processSection(heading, content) {
    // First, check if the content contains existing questions
    const existingQuestions = this.extractExistingQuestions(content);
    
    if (existingQuestions.length > 0) {
      // For each found question, find its answer in the content
      existingQuestions.forEach(question => {
        const answer = this.findAnswerForQuestion(question, content);
        if (answer && !this.isQuestionFragment(question, answer)) {
          this.addQnA(question, answer);
        }
      });
    } else {
      // // Generate questions from the heading and content
      // const headingQuestions = this.generateQuestionsFromStatement(heading);
      // const firstSentence = content.split('.')[0].trim();
      // const contentQuestions = this.generateQuestionsFromStatement(firstSentence);
      
      // const allQuestions = [...new Set([...headingQuestions, ...contentQuestions])];
      
      // allQuestions.forEach(question => {
      //   if (!this.isQuestionFragment(question, content)) {
      //     this.addQnA(question, content);
      //   }
      // });
    }
  }

  processParagraphs(content, pageType, $) {
    content.find('p').each((index, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      
      if (text.length > 50 && text.length < 1000) {
        const existingQuestions = this.extractExistingQuestions(text);
        
        if (existingQuestions.length > 0) {
          existingQuestions.forEach(question => {
            const answer = this.findAnswerForQuestion(question, text);
            if (answer && !this.isQuestionFragment(question, answer)) {
              this.addQnA(question, answer);
            }
          });
        } else {
          // Try to generate questions from the first sentence
          // const firstSentence = text.split(/[.!?]+/)[0].trim();
          // if (firstSentence && firstSentence.length > 15) {
          //   const questions = this.generateQuestionsFromStatement(firstSentence);
          //   questions.forEach(question => {
          //     if (!this.isQuestionFragment(question, text)) {
          //       this.addQnA(question, text);
          //     }
          //   });
          // }
        }
      }
    });
  }

  findAnswerForQuestion(question, content) {
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
    const questionIndex = sentences.findIndex(s => 
      s.toLowerCase().includes(question.toLowerCase().replace(/\?/g, ''))
    );
    
    if (questionIndex !== -1) {
      // Return sentences after the question
      const answerSentences = sentences.slice(questionIndex + 1).join('. ');
      return answerSentences || content; // Fallback to entire content
    }
    
    return content; // Fallback to entire content
  }

  addQnA(question, answer) {
    // Avoid duplicates and poor quality
    const existing = this.qnas.find(q => 
      q.data.questions.en[0].toLowerCase() === question.toLowerCase()
    );
    
    if (!existing && this.isGoodQuestion(question) && answer.length > 20) {
      const qna = {
        id: this.generateId(question),
        data: {
          action: "text",
          contexts: ["global"],
          enabled: true,
          answers: {
            en: [answer.substring(0, 1000)] // Limit answer length
          },
          questions: {
            en: [question]
          },
          redirectFlow: "",
          redirectNode: ""
        }
      };
      this.qnas.push(qna);
    }
  }

  getFormattedJSON() {
    return {
      qnas: this.qnas,
      contentElements: []
    };
  }

  saveToFile(filename = 'qna_export.json') {
    const data = this.getFormattedJSON();
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`QnA data saved to ${filename}. Found ${this.qnas.length} QnA pairs.`);
  }

  async getCleanContent(url) {
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

  clear() {
    this.qnas = [];
  }
}

// Usage Examples
// async function main() {
//   const scraper = new GenericQnAScraper();
  
//   // Test with different types of websites
//   const testUrls = [
//     'https://example.com/about',
//     'https://example.com/services',
//     'https://example.com/faq',
//     'https://example.com/products'
//   ];
  
//   for (const url of testUrls) {
//     try {
//       console.log(`Scraping: ${url}`);
//       await scraper.scrapePage(url, 'generic');
//       console.log(`Found ${scraper.qnas.length} QnA pairs so far...`);
//     } catch (error) {
//       console.log(`Failed to scrape ${url}:`, error.message);
//     }
//   }
  
//   scraper.saveToFile('generic_qna_export.json');
// }

// // Run if this file is executed directly
// if (require.main === module) {
//   main().catch(console.error);
// }

module.exports = GenericQnAScraper;