const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

router.post("/subscribe", async (req, res) => {
  const email = String(req.body.email || "").trim();
  if (!email) {
    return res.status(400).send("Invalid email address.");
  }

  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const list = `newsletter@${domain}`;

  try {
    const response = await fetch(`https://api.mailgun.net/v3/lists/${list}/members`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from("api:" + apiKey).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        address: email,
        subscribed: "true"
      })
    });

    if (response.ok) {
      res.send("Thanks for subscribing!");
    } else {
      const text = await response.text();
      console.error("Mailgun error:", text);
      res.status(500).send("There was an error connecting to Mailgun.");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error.");
  }
});

module.exports = router;