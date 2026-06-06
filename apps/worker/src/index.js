require('dotenv').config();
const { startConsumer } = require('./consumer');

const QUEUES = process.env.QUEUES.split(',').map(q => q.trim());

console.log(`Starting worker: ${process.env.WORKER_ID}`);
console.log(`Watching queues: ${QUEUES.join(', ')}`);

startConsumer(QUEUES).catch((err) => {
  console.error('Worker crashed:', err);
  process.exit(1);
});