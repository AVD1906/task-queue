require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('./redis');
const { createPool } = require('./db');
const { enqueue } = require('./queue');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.json());

global.io = io;

io.on('connection', (socket) => {
  console.log('Dashboard connected:', socket.id);

  socket.on('job:active',    (data) => io.emit('job:active', data));
  socket.on('job:completed', (data) => io.emit('job:completed', data));
  socket.on('job:failed',    (data) => io.emit('job:failed', data));
  socket.on('job:retry',     (data) => io.emit('job:retry', data));

  socket.on('disconnect', () => {
    console.log('Dashboard disconnected:', socket.id);
  });
});

app.get('/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/jobs', async (req, res) => {
  const { queue, payload } = req.body;
  if (!queue || !payload) {
    return res.status(400).json({ error: 'queue and payload are required' });
  }
  const jobId = await enqueue(queue, payload);
  res.status(201).json({ jobId, queue, status: 'waiting' });
});

app.get('/jobs', async (req, res) => {
  const pool = require('./db').getPool();
  const { rows } = await pool.query(
    'SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50'
  );
  res.json(rows);
});

app.get('/jobs/stats', async (req, res) => {
  const pool = require('./db').getPool();
  const { rows } = await pool.query(`
    SELECT 
      queue,
      status,
      COUNT(*) as count
    FROM jobs
    GROUP BY queue, status
    ORDER BY queue, status
  `);
  res.json(rows);
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await createClient();
    console.log('Redis connected');
    await createPool();
    console.log('Postgres connected');
    server.listen(PORT, () => {
      console.log(`API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();