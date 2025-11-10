const { Worker } = require('bullmq');
const { ResultsQueue } = require('../queues/EvexiaQueue');
const initKnex = require('../db/initKnex');
const { sendLabResultsNotification } = require('../utils/email');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
};

const worker = new Worker('resultsQueue', async (job) => {
  const { patientOrderId, patientId } = job.data;
  console.log('[resultsWorker] Checking results for order:', patientOrderId);

  try {
    const knex = await initKnex();

    // Check if results already stored
    const existing = await knex('lab_results').where({ patient_order_id: patientOrderId }).first();
    if (existing) {
      console.log('Results already stored for order:', patientOrderId);
      return { status: 'already_stored' };
    }

    // Call orderSummaryHandler to check status
    const orderSummaryUrl = `${process.env.FRONTEND_URL || 'http://localhost:5050'}/api/evexia/order-summary?PatientID=${patientId}&PatientOrderID=${patientOrderId}`;

    // Since it's internal, call the handler directly
    const { orderSummaryHandler } = require('../routes/evexiaRoutes');
    const mockReq = { query: { PatientID: patientId, PatientOrderID: patientOrderId } };
    const mockRes = {
      status: (code) => ({ json: (data) => ({ code, data }) }),
      json: (data) => data
    };

    const result = await orderSummaryHandler(mockReq, mockRes);

    if (result.ready) {
      console.log('Results ready for order:', patientOrderId);

      // Store results (assuming lab data is in result.lab)
      await knex('lab_results').insert({
        patient_id: patientId,
        patient_order_id: patientOrderId,
        raw_json: JSON.stringify(result.lab),
        updated_at: new Date()
      });

      // Notify doctor and patient
      // Need to get emails
      const payment = await knex('stripe_payments').where({ evexia_processed: true }).orderBy('created_at', 'desc').first(); // rough
      const patientEmail = payment?.metadata?.EmailAddress;
      const doctorEmail = 'doctor@bettermindcare.com'; // placeholder

      const resultsLink = `${process.env.FRONTEND_URL}/my-reports`; // placeholder

      if (patientEmail) {
        await sendLabResultsNotification(patientEmail, 'Patient', resultsLink);
      }
      if (doctorEmail) {
        await sendLabResultsNotification(doctorEmail, 'Patient', resultsLink);
      }

      return { status: 'stored_and_notified' };
    } else {
      console.log('Results not ready yet for order:', patientOrderId);
      return { status: 'not_ready' };
    }
  } catch (err) {
    console.error('[resultsWorker] Error:', err);
    throw err;
  }
}, { connection });

// Logging
worker.on('completed', (job) => {
  console.log(`[resultsWorker] job ${job.id} done`);
});

worker.on('failed', (job, err) => {
  console.error(`[resultsWorker] job ${job.id} failed:`, err);
});

module.exports = worker;