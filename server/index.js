// server/index.js
//
// Express application entry point for the InvoiceGen backend.
//
// Responsibilities:
//   - Load environment variables from .env (dotenv)
//   - Configure CORS + JSON body parsing
//   - Register API routes
//   - Start the HTTP server
//
// SECURITY: The Resend API key lives only in process.env (server/.env) and
// is consumed exclusively by services/emailService.js. It is never exposed
// to the frontend.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import invoiceRoutes from './routes/invoiceRoutes.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ---- Middleware -----------------------------------------------------------
// Allow the Vite dev server (default 5173) and any configured origin to call
// the API. CORS is intentionally permissive in dev; tighten in production.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  }),
);
app.use(express.json({ limit: '1mb' }));

// ---- Health check ---------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'invoicegen-server' });
});

// ---- Routes ---------------------------------------------------------------
// Register the invoice router under /api/invoices so the full endpoint is
// POST /api/invoices/send
app.use('/api/invoices', invoiceRoutes);

// ---- 404 handler ----------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// ---- Global error handler -------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  // Body-parser throws this for malformed JSON payloads.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body.' });
  }
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ---- Start ----------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[server] InvoiceGen backend listening on http://localhost:${PORT}`);
  console.log(`[server] POST /api/invoices/send to deliver an invoice email`);
});
