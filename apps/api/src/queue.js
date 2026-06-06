const { getClient } = require('./redis');
const { getPool } = require('./db');
const crypto = require('crypto');

async function enqueue(queueName, payload) {
  const jobId = crypto.randomUUID();
  const pool = getPool();
  const redis = getClient();

  // 1. Save to Postgres first (source of truth)
  await pool.query(
    `INSERT INTO jobs (id, queue, payload, status)
     VALUES ($1, $2, $3, 'waiting')`,
    [jobId, queueName, JSON.stringify(payload)]
  );

  // 2. Push to Redis Stream
  await redis.xadd(
    `queue:${queueName}`,  // stream name
    '*',                    // auto-generate message ID
    'jobId', jobId,
    'queue', queueName,
    'payload', JSON.stringify(payload),
    'attempts', '0'
  );

  console.log(`Enqueued job ${jobId} to queue:${queueName}`);
  return jobId;
}

module.exports = { enqueue };