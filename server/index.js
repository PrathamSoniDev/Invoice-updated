// Express application entry point for the InvoiceGen backend.
//
// The Resend API key lives only in process.env (server/.env) and
// is consumed exclusively by services/emailService.js. It is never exposed
// to the frontend.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import invoiceRoutes from './routes/invoiceRoutes.js';
import paymentRoutes from "./routes/paymentRoutes.js";
import paytmRoutes from "./routes/paytmRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Allow the Vite dev server (default 5173) and any configured origin to call
// the API. CORS is intentionally permissive in dev; tighten in production.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  }),
);

// The Razorpay webhook signature is an HMAC over the exact raw request
// bytes Razorpay sent — it must be captured as a Buffer BEFORE the global
// express.json() below parses (and potentially re-serializes) the body, or
// signature verification will fail. This has to be registered first and
// scoped to only this one path; every other route still gets normal JSON
// parsing. (Paytm's checksum is computed over the parsed field set, not raw
// bytes, so /api/webhooks/paytm doesn't need this and uses the global
// json()/urlencoded() parsers below like everything else.)
app.use('/api/webhooks/razorpay', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ---- Health check ---------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'invoicegen-server' });
});

// ---- Routes ---------------------------------------------------------------
// Register the invoice router under /api/invoices so the full endpoint is
// POST /api/invoices/send
app.use('/api/invoices', invoiceRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/paytm", paytmRoutes);
app.use("/api/users", userRoutes);
app.use("/api/webhooks", webhookRoutes);

// ---- 404 handler ----------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// ---- Global error handler -------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
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


