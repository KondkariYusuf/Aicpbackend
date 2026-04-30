'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const apiResponse = require('./utils/apiResponse');

// Route modules
const authRoutes = require('./modules/auth/auth.routes');
const hubsRoutes = require('./modules/hubs/hubs.routes');
const driversRoutes = require('./modules/drivers/drivers.routes');
const shipmentsRoutes = require('./modules/shipments/shipments.routes');
const tripsRoutes = require('./modules/trips/trips.routes');
const assignRoutes = require('./modules/assign/assign.routes');

const app = express();

// ── Global Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/hubs', hubsRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/shipments', shipmentsRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/assign', assignRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  apiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
});

// ── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error.';
  apiResponse.error(res, message, statusCode);
});

module.exports = app;
