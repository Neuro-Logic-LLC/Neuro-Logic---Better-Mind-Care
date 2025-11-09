// listener/paymentListener.js
const pg = require('pg');
const initKnex = require('../db/initKnex.js');
const runEvexiaSequence = require('../evexiaService/evexiaService.js');
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const { parseEvexiaPdfText } = require('../utils/parseEvexiaPdfText');

const HARD_DEFAULT_AUTH_KEY = process.env.EVEXIA_BEARER_TOKEN;
const HARD_DEFAULT_CLIENT_ID = process.env.EVEXIA_EXTERNAL_CLIENT_ID;
const LOG_SLICE = Number(process.env.EVEXIA_LOG_SLICE || 1200);
const DEBUG = /^(1|true)$/i.test(process.env.EVEXIA_DEBUG || '');
const IS_PROD = process.env.NODE_ENV === 'production';
const dlog = (...a) => DEBUG && console.log('[Evexia]', ...a);
const makeFilename = (pid, poid) => `lab-${pid}-${poid}.pdf`;

(async () => {
  const knex = await initKnex();

  /**
   * Handles one payment event
   */
  async function processPayment(payment) {
    const metadata =
      typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata;

    const patientData = {
      ...metadata,
      user_id: payment.user_id,
      productID: payment.product_key,
      currency: payment.currency,
      amount: payment.amount,
      isPanel: false
    };
    function hasRequiredFields(data) {
      const required = [
        'FirstName',
        'LastName',
        'DOB',
        'Gender',
        'EmailAddress',
        'StreetAddress',
        'City',
        'State',
        'PostalCode',
        'Phone'
      ];
      return required.every(k => data[k]);
    }

    if (!hasRequiredFields(patientData)) {
      console.warn(
        '[paymentListener] Missing required patient fields, skipping Evexia sequence for payment',
        payment.id
      );
      return;
    }
    
    await runEvexiaSequence(patientData);
    await knex('stripe_payments').where({ id: payment.id }).update({ evexia_processed: true });

    console.log(`[paymentListener] Evexia sequence complete for user ${payment.user_id}`);
  }

  /**
   * Reconnectable listener
   */
  async function startListener() {
    try {
      const client = new pg.Client(knex.client.config.connection);
      await client.connect();
      console.log('[paymentListener] Connected to Postgres');
      await client.query('LISTEN payment_paid');
      console.log('[paymentListener] Listening for payment_paid events');

      // Catch any missed paid rows
      const pending = await knex('stripe_payments').where({
        status: 'paid',
        evexia_processed: false
      });

      for (const p of pending) {
        console.log(`[Startup] Processing missed payment ${p.id}`);
        await processPayment(p);
      }

      // Live notifications
      client.on('notification', async msg => {
        try {
          const payment = JSON.parse(msg.payload);
          console.log(`[paymentListener] Received payment_paid for user ${payment.user_id}`);
          await processPayment(payment);
        } catch (err) {
          console.error('[paymentListener] Error in notification:', err);
        }
      });

      // Handle unexpected disconnects
      client.on('error', async err => {
        console.error('[paymentListener] Connection error, retrying in 5s:', err.message);
        await client.end().catch(() => {});
        setTimeout(startListener, 5000);
      });

      client.on('end', () => {
        console.warn('[paymentListener] Connection closed, retrying in 5s...');
        setTimeout(startListener, 5000);
      });
    } catch (err) {
      console.error('[paymentListener] Fatal error connecting, retrying in 5s:', err.message);
      setTimeout(startListener, 5000);
    }
  }

  // Boot it up
  startListener();
})();
