const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

class UniversalQnAScraper {
  constructor() {
    this.qnas = [];
  }

  generateId(text) {
    const randomStr = Math.random().toString(36).substring(2, 12);
    const slug = text.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_+|_+$)/g, '')
      .substring(0, 20);
    return `${randomStr}_${slug}`;
  }

  // Method 1: For FAQ Pages (original approach)
  async scrapeFAQPage(url, selectors = {}) {
    try {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);

      const {
        container = '.faq-item, .qna-item, [class*="faq"], [class*="qna"]',
        question = 'h3, h4, .question, .faq-question, .qna-question',
        answer = 'p, .answer, .faq-answer, .qna-answer, div:not(.question)'
      } = selectors;

      $(container).each((index, element) => {
        const $element = $(element);
        const questionText = $element.find(question).first().text().trim();
        const answerText = $element.find(answer).first().text().trim();

        if (questionText && answerText && answerText.length > 10) {
          this.addQnA(questionText, answerText);
        }
      });

      return this.getFormattedJSON();
    } catch (error) {
      console.error('Error scraping FAQ page:', error.message);
      throw error;
    }
  }

  // Method 2: For Narrative Pages (About Us, Services, etc.)
  async scrapeNarrativePage(url, pageType = 'info') {
    try {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $('script, style, nav, footer, header').remove();

      const content = $('main, .content, .container, .about-content, body').first();
      
      const sections = [];
      
      // Extract headings and their following content
      content.find('h1, h2, h3, h4, h5, h6').each((index, element) => {
        const $heading = $(element);
        const headingText = $heading.text().trim();
        
        if (headingText && headingText.length > 3) {
          let contentText = '';
          let nextElement = $heading.next();
          
          // Collect content until next heading
          while (nextElement.length && !nextElement.is('h1, h2, h3, h4, h5, h6')) {
            const text = nextElement.text().trim();
            if (text && nextElement.is('p, div, li')) {
              contentText += text + ' ';
            }
            nextElement = nextElement.next();
          }
          
          contentText = contentText.trim();
          if (contentText && contentText.length > 20) {
            sections.push({
              heading: headingText,
              content: contentText
            });
          }
        }
      });

      // Convert sections to Q&A
      sections.forEach(section => {
        const questions = this.generateQuestionsFromHeading(section.heading, pageType);
        questions.forEach(question => {
          this.addQnA(question, section.content);
        });
      });

      // Also extract key paragraphs as general knowledge
      this.extractKeyParagraphs(content, pageType, $);

      return this.getFormattedJSON();
    } catch (error) {
      console.error('Error scraping narrative page:', error.message);
      throw error;
    }
  }

  // Generate multiple question variations from a heading
  generateQuestionsFromHeading(heading, pageType) {
    const questions = [heading];
    
    // Add question mark if not present
    if (!heading.endsWith('?')) {
      questions.push(heading + '?');
    }
    
    // Generate alternative questions based on content type
    const lowerHeading = heading.toLowerCase();
    
    if (pageType === 'about') {
      if (lowerHeading.includes('about') || lowerHeading.includes('story')) {
        questions.push('What is your company story?');
        questions.push('Tell me about your company');
      }
      if (lowerHeading.includes('mission') || lowerHeading.includes('vision')) {
        questions.push('What is your mission?');
        questions.push('What is your company vision?');
      }
      if (lowerHeading.includes('team') || lowerHeading.includes('founder')) {
        questions.push('Who is on your team?');
        questions.push('Who founded the company?');
      }
      if (lowerHeading.includes('value') || lowerHeading.includes('belief')) {
        questions.push('What are your values?');
        questions.push('What do you believe in?');
      }
    }
    
    if (pageType === 'services') {
      questions.push(`What is ${heading}?`);
      questions.push(`Tell me about ${heading}`);
      questions.push(`How does ${heading} work?`);
    }

    return [...new Set(questions)]; // Remove duplicates
  }

  // Extract important paragraphs as general knowledge
  extractKeyParagraphs(content, pageType, $) {
    content.find('p, li').each((index, element) => {
      const text = $(element).text().trim();
      if (text.length > 50 && text.length < 500) { // Reasonable length
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        if (sentences.length >= 1) {
          const firstSentence = sentences[0].trim();
          const remainingText = sentences.slice(1).join('. ').trim();
          const fullAnswer = remainingText ? `${firstSentence}. ${remainingText}` : firstSentence;
          
          if (firstSentence.length > 15) {
            const questions = this.generateQuestionsFromSentence(firstSentence, pageType);
            questions.forEach(question => {
              this.addQnA(question, fullAnswer);
            });
          }
        }
      }
    });
  }

  generateQuestionsFromSentence(sentence, pageType) {
    // Simple question generation - you can make this more sophisticated
    const questions = [];
    
    // Remove any existing punctuation and add question mark
    const cleanSentence = sentence.replace(/[.!?]+$/, '');
    
    // Basic question forms
    questions.push(`What is ${cleanSentence}?`);
    questions.push(`Tell me about ${cleanSentence}`);
    questions.push(cleanSentence + '?');
    
    // Context-specific questions
    if (pageType === 'about') {
      questions.push(`How does this relate to ${cleanSentence}?`);
      questions.push(`Why is ${cleanSentence} important?`);
    }
    
    return questions;
  }

  // Method 3: Auto-detect page type and scrape accordingly
  async scrapeAnyPage(url) {
    try {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);
      
      // Detect page type from URL and content
      let pageType = 'generic';
      const urlLower = url.toLowerCase();
      const title = $('title').text().toLowerCase();
      
      if (urlLower.includes('about') || title.includes('about')) {
        pageType = 'about';
      } else if (urlLower.includes('faq') || title.includes('faq') || title.includes('question')) {
        pageType = 'faq';
      } else if (urlLower.includes('service') || title.includes('service')) {
        pageType = 'services';
      } else if (urlLower.includes('product') || title.includes('product')) {
        pageType = 'products';
      }
      
      console.log(`Detected page type: ${pageType}`);
      
      if (pageType === 'faq') {
        return await this.scrapeFAQPage(url);
      } else {
        return await this.scrapeNarrativePage(url, pageType);
      }
    } catch (error) {
      console.error('Error in auto-scraping:', error.message);
      throw error;
    }
  }

  addQnA(question, answer) {
    // Avoid duplicates
    const existing = this.qnas.find(q => 
      q.data.questions.en[0].toLowerCase() === question.toLowerCase()
    );
    
    if (!existing && question.length > 5 && answer.length > 10) {
      const qna = {
        id: this.generateId(question),
        data: {
          action: "text",
          contexts: ["global"],
          enabled: true,
          answers: {
            en: [answer]
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

  clear() {
    this.qnas = [];
  }
}

// // Usage Examples
// async function main() {
//   const scraper = new UniversalQnAScraper();

//   // Example 1: Scrape an "About Us" page
//   console.log('Scraping About Us page...');
//   await scraper.scrapeNarrativePage('https://example.com/about-us', 'about');
//   scraper.saveToFile('about_us_qna.json');
//   scraper.clear();

//   // Example 2: Auto-detect and scrape any page
//   console.log('Auto-scraping services page...');
//   await scraper.scrapeAnyPage('https://example.com/services');
//   scraper.saveToFile('services_qna.json');
//   scraper.clear();

//   // Example 3: Scrape FAQ page (still works)
//   console.log('Scraping FAQ page...');
//   await scraper.scrapeFAQPage('https://example.com/faq');
//   scraper.saveToFile('faq_qna.json');
// }

// // Run if this file is executed directly
// if (require.main === module) {
//   main().catch(console.error);
// }

module.exports = UniversalQnAScraper;