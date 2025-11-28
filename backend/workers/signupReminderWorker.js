const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const initKnex = require("../db/knex-init");
const { sendMagicResumeLink } = require("../utils/email");

async function runSignupReminderWorker() {
  try {
    const knex = await initKnex();

    console.log("⏳ Checking for abandoned signups...");

    //
    // 1️⃣ CHECKOUT ABANDONERS
    //
    const stuckAtCheckout = await knex("pending_signup")
      .where("reminder_sent_checkout", false)
      .whereNotNull("checkout_reached_at")
      .where("stripe_ok", false)
      .where(
        "checkout_reached_at",
        "<",
        knex.raw("NOW() - INTERVAL '4 hours'")
      );

    for (const row of stuckAtCheckout) {    
      console.log("💌 Sending checkout reminder to:", row.email);

      // 1. Generate fresh token
      const token = crypto.randomUUID();
      const hash = await bcrypt.hash(token, 12);

      // 2. Store hashed token & mark reminder sent
      await knex("pending_signup")
        .where({ id: row.id })
        .update({
          magic_token_hash: hash,
          magic_token_expires_at: knex.raw("NOW() + INTERVAL '30 minutes'"),
          reminder_sent_checkout: true,
          date_last_modified: knex.fn.now()
        });

      // 3. Send email
      await sendMagicResumeLink(row.email, token);
    }

    //
    // 2️⃣ INTAKE ABANDONERS
    //
    const stuckAtAccountInfo = await knex("pending_signup")
      .where("stripe_ok", true)
      .where("intake_ok", false)
      .whereNotNull("account_info_reached_at")
      .where(
        "account_info_reached_at",
        "<",
        knex.raw("NOW() - INTERVAL '4 hours'")
      )
      .where("reminder_sent_intake", false);

    for (const row of stuckAtAccountInfo) {
      console.log("💌 Sending intake reminder to:", row.email);

      // 1. Generate fresh token
      const token = crypto.randomUUID();
      const hash = await bcrypt.hash(token, 12);

      // 2. Save hash & mark reminder sent
      await knex("pending_signup")
        .where({ id: row.id })
        .update({
          magic_token_hash: hash,
          magic_token_expires_at: knex.raw("NOW() + INTERVAL '30 minutes'"),
          reminder_sent_intake: true,
          date_last_modified: knex.fn.now()
        });

      // 3. Send email
      await sendMagicResumeLink(row.email, token);
    }

    console.log("✅ Reminder worker finished");

  } catch (err) {
    console.error("❌ Reminder worker crashed:", err);
  }
}

function startSignupReminderWorker() {
  runSignupReminderWorker();
  setInterval(runSignupReminderWorker, 10 * 60 * 1000);
}

module.exports = { startSignupReminderWorker };
