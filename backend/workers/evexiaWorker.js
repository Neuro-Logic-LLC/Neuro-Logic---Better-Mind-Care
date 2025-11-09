// const { Worker } = require('bullmq');
// const runEvexiaSequence = require('../routes/evexiaRoutes'); // same import you used
// const db = require('../db'); // if you’re using Knex or similar

// const connection = {
//   host: process.env.REDIS_HOST || '127.0.0.1',
//   port: process.env.REDIS_PORT || 6379,
// };

// const worker = new Worker('evexiaQueue', async (job) => {
//   const { patientData } = job.data;
//   console.log('[evexiaWorker] running Evexia sequence for', patientData.EmailAddress);
//   await runEvexiaSequence(patientData);
//   console.log('[evexiaWorker] Evexia sequence complete for', patientData.EmailAddress);
// }, { connection });

// // Logging
// worker.on('completed', (job) => {
//   console.log(`[evexiaWorker] job ${job.id} done`);
// });

// worker.on('failed', (job, err) => {
//   console.error(`[evexiaWorker] job ${job.id} failed:`, err);
// });