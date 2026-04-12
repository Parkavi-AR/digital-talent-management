const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail', // ✅ IMPORTANT FIX
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

const sendEmail = async (to, subject, htmlContent, attachments) => {
  try {
    const mailOptions = {
      from: `"RyniXsoft Talent Management" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
      attachments: attachments || [],
    };

    const mailTransporter = getTransporter();

    const info = await mailTransporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully: ${info.response}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
};