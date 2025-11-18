const express = require('express');
const router = express.Router();
const mailgun = require('mailgun-js');

// Initialize Mailgun (replace with your domain and API key)
const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN
});

// Newsletter subscribe endpoint
router.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Add to Mailgun mailing list (replace 'newsletter@yourdomain.com' with your list address)
    const listAddress = 'newsletter@yourdomain.com'; // Update this

    await mg.lists(listAddress).members().create({
      subscribed: true,
      address: email
    });

    res.json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Mailgun error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

module.exports = router;