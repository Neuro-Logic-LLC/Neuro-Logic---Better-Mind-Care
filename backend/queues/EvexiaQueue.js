// queues/evexiaQueue.js
const { Queue } = require('bullmq');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
};

export const EvexiaQueue = new Queue('evexiaQueue', { connection: redisConfig });
export const ResultsQueue = new Queue('resultsQueue', { connection: redisConfig });           