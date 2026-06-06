const { Pool } = require('pg');

let pool;

async function createPool() {
  pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  });

  // Test the connection
  const client = await pool.connect();
  client.release();
  return pool;
}

function getPool() {
  if (!pool) throw new Error('Postgres not initialized');
  return pool;
}

module.exports = { createPool, getPool };