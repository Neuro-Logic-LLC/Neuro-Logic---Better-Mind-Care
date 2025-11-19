const loadSSMParams = require('../utils/loadSSMParams');
const express = require('express');
const crypto = require('crypto');


const knexfile = require('../knexfile');
const initKnex = require('../db/initKnex');
const router = express.Router();

// ---- Knex singleton ----
let __knex;

// ---- Config ----
const TABLE = 'evexia_webhook_events';
const WEBHOOK_SECRET = process.env.EVEXIA_SANDBOX_EXTERNAL_CLIENT_ID || '';

// ---- Helpers ----
function pickIds(obj = {}) {
  const patientId = obj.PatientID ?? obj.patientID ?? obj.patientId ?? null;
  const patientOrderId = obj.PatientOrderID ?? obj.patientOrderID ?? obj.patientOrderId ?? null;
  return {
    patient_id: patientId ? String(patientId) : null,
    patient_order_id: patientOrderId ? String(patientOrderId) : null
  };
}

function eventIdFrom({ payload, raw, query }) {
  const explicit = payload?.EventID || payload?.eventId || query?.EventID || query?.eventId || null;
  if (explicit) return String(explicit);

  const idem = payload?.idempotencyKey || query?.idempotencyKey || null;
  if (idem) return String(idem);

  const basis = raw ?? Buffer.from(JSON.stringify(query || {}));
  return crypto.createHash('sha256').update(basis).digest('hex');
}

// ---- Webhook Handler (POST /lab-result-webhook) ----
router.post('/lab-result-webhook', express.raw({ type: '*/*' }), async (req, res) => {
  const knex = await initKnex();

  try {
    // 1. Always acknowledge immediately
    res.status(200).send('ok');

    // 2. Process asynchronously to avoid retries
    process.nextTick(async () => {


      // Normalize body
      const ct = (req.headers['content-type'] || '').toLowerCase();
      const raw = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(
            typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
            'utf8'
          );

      // Optional HMAC verification
      const sig = req.headers['x-evexia-signature'];
      if (WEBHOOK_SECRET && sig) {
        const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
        if (
          expected.length !== String(sig).length ||
          !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig)))
        ) {
          console.warn('Bad signature: event accepted but ignored');
          return;
        }
      }

      // Parse JSON if possible
      let payload = null;
      let text = null;
      if (ct.includes('application/json')) {
        try {
          payload = JSON.parse(raw.toString('utf8'));
        } catch {
          text = raw.toString('utf8');
        }
      } else if (!ct.includes('application/pdf')) {
        text = raw.toString('utf8');
      }

      const ids = payload ? pickIds(payload) : {};
      const event_id = eventIdFrom({ payload, raw, query: req.query });

      // Insert into evexia_webhook_events
      try {
        await knex(TABLE)
          .insert({
            event_id,
            ...ids,
            content_type: ct || 'application/octet-stream',
            body_json: payload || null,
            body_text: text || null,
            received_at: knex.fn.now()
          })
          .onConflict(['event_id'])
          .ignore();
      } catch (e) {
        console.error('[evexia webhook async error]', (e && e.stack) || e);
      }

       // Decode and store PDF if present
       if (payload?.Report) {
         const pdfBuffer = Buffer.from(payload.Report, 'base64');
         await knex('lab_results')
           .insert({
             patient_id: payload.PatientID,
             patient_order_id: payload.PatientOrderID,
             external_client_id: payload.externalClientID ?? payload.ClientID ?? null,
             specimen: payload.Specimen ?? null,
             create_date: payload.CreateDate ?? null,
             collection_date: payload.CollectionDate ?? null,
             report_pdf: pdfBuffer,
             raw_json: payload,
             updated_at: knex.fn.now()
           })
           .onConflict('patient_order_id')
           .merge();

         // Send message to user about new lab results
         try {
           const user = await knex('users').where('id', payload.PatientID).first();
           if (user) {
             await knex('messages').insert({
               recipient_id: user.id,
               sender_type: 'system',
               category: 'system_update',
               title: 'Your Lab Results Are Ready',
               body: 'Your lab results have been received and are now available in your Reports & Labs section. Please log in to view them.',
               is_sent: true
             });
           }
         } catch (msgError) {
           console.error('Failed to send lab results message:', msgError);
         }
       }
    });
  } catch (e) {
    console.error('[evexia webhook error]', e);
    // We already sent 200 OK; swallow errors to avoid retries
  }
});

module.exports = router;
