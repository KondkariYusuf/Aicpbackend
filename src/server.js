'use strict';
require('./config/env'); // Validate env vars on startup
const app = require('./app');
const { port } = require('./config/env');

// Test DB connection on boot
const { pool } = require('./config/db');
pool.query('SELECT NOW()').then(() => {
  console.log('✅ Database connection verified');
}).catch((err) => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});

const server = app.listen(port, () => {
  console.log(`🚀 GeoFleet API running on http://localhost:${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    pool.end(() => {
      console.log('Database pool closed.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
