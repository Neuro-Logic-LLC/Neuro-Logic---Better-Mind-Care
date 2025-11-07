require('dotenv').config({ path: '../.env' });
const { sendMfaCode } = require('./utils/email');

console.log('MAILGUN_API_KEY:', process.env.MAILGUN_API_KEY ? 'loaded' : 'not loaded');
console.log('MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN);

async function test() {
  try {
    await sendMfaCode('admin@bettermindcare.com', '123456');
    console.log('Email sent successfully');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();