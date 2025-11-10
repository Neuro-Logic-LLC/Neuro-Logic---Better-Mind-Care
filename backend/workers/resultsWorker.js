const { Worker } = require('bullmq');
const { ResultsQueue } = require('../queues/EvexiaQueue');
const initKnex = require('../db/initKnex');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
};

const worker = new Worker('resultsQueue', async (job) => {
  const { patientOrderId, patientId } = job.data;
  console.log('[resultsWorker] Checking results for order:', patientOrderId);

  try {
    // Poll Evexia for results
    // Use the labResultHandler or similar

    // For now, placeholder
    console.log('Polling Evexia for results...');

    // If results ready, store in DB and notify

    return { status: 'checked' };
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