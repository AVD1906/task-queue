const Redis = require('ioredis');

let client;

async function createClient() {
  client = new Redis(process.env.REDIS_URL);
  
  client.on('error', (err) => {
    console.error('Redis error:', err);
  });

  // Test the connection
  await client.ping();
  return client;
}

function getClient() {
  if (!client) throw new Error('Redis not initialized');
  return client;
}

module.exports = { createClient, getClient };