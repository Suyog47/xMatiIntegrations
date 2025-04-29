const nodemailer = require('nodemailer');

async function sendEmail(to, cc, bcc, subject, content) {
  // Create a transporter object using SMTP transport
  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Replace with your SMTP host
    port: 587, // Replace with your SMTP port (usually 587 or 465)
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'xmatiservice@gmail.com', // Replace with your email address
      pass: 'ecbd sezb rfep nmzh' // Replace with your email password or app password
    },
    requireTLS: true,
    tls: {
      rejectUnauthorized: false
    }
  });

  // Define the email message
  let message = {
    from: '"Xmati Chat Service" <xmatiservice@gmail.com>',
    to: to,
    cc: cc,
    bcc: bcc,
    subject: subject,
    text: content, // Use text for plain text content
    html: content, // Use html for rich text content
  };

  try {
    // Send the email
    let info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
    return true; // Return true if email was sent successfully
  } catch (error) {
    console.error('Error sending email:', error);
    return false; // Return false if there was an error
  }
}

module.exports = { sendEmail };