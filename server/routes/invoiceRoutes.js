// server/routes/invoiceRoutes.js
//
// Express router for invoice-related endpoints.
// All email sending is delegated to the backend emailService so the
// Resend API key never leaves the server.

import { Router } from 'express';
import { sendInvoiceEmail } from '../services/emailService.js';

const router = Router();

/**
 * Basic email format check. This is a lightweight guard — Resend performs
 * its own validation, but rejecting obviously bad input early gives the
 * caller a clean 400 instead of a confusing upstream error.
 *
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * POST /api/invoices/send
 *
 * Request body:
 *   {
 *     "customerEmail": "buyer@example.com",
 *     "customerName": "Jane Doe",
 *     "invoice": {
 *       "number": "INV-001",
 *       "lineItems": [{ "description": "...", "quantity": 1, "rate": 100, "amount": 100 }],
 *       "subtotal": 100,
 *       "taxAmount": 18,
 *       "total": 118,
 *       "dueDate": "2026-07-31"
 *     }
 *   }
 *
 * Success response (200):
 *   { "success": true, "message": "Invoice sent successfully" }
 */
router.post('/send', async (req, res) => {
  // ---- Log the incoming request -------------------------------------------
  console.log('[invoiceRoutes] POST /send received:', {
    customerEmail: req.body?.customerEmail,
    customerName: req.body?.customerName,
    invoiceNumber: req.body?.invoice?.number,
    itemCount: Array.isArray(req.body?.invoice?.lineItems)
      ? req.body.invoice.lineItems.length
      : 0,
    total: req.body?.invoice?.total,
  });

  try {
    const { customerEmail, customerName, invoice } = req.body ?? {};

    // ---- Validate required fields -----------------------------------------
    const missing = [];
    if (!customerEmail) missing.push('customerEmail');
    if (!customerName) missing.push('customerName');
    if (!invoice) missing.push('invoice');

    if (missing.length > 0) {
      console.warn('[invoiceRoutes] Validation failed — missing fields:', missing);
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(', ')}`,
      });
    }

    if (!isValidEmail(customerEmail)) {
      console.warn('[invoiceRoutes] Validation failed — invalid email:', customerEmail);
      return res.status(400).json({
        success: false,
        message: 'customerEmail must be a valid email address.',
      });
    }

    if (!invoice.number || typeof invoice.number !== 'string') {
      console.warn('[invoiceRoutes] Validation failed — invalid invoice.number:', invoice.number);
      return res.status(400).json({
        success: false,
        message: 'invoice.number is required and must be a string.',
      });
    }

    // Validate that the invoice contains at least one line item. This is the
    // backend safety net — even if frontend validation is bypassed, we refuse
    // to send an email for an invoice with no items.
    //
    // We check array length only, NOT description content. The frontend Review
    // page renders every item in the array (showing '—' for empty
    // descriptions), so the backend must accept the same collection. Filtering
    // by description here would reject invoices the user can see and send.
    const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    if (items.length === 0) {
      console.warn('[invoiceRoutes] Validation failed — no line items');
      return res.status(400).json({
        success: false,
        message: 'Please add at least one line item.',
      });
    }

    // ---- Log the email payload summary ------------------------------------
    console.log('[invoiceRoutes] Sending email:', {
      recipient: customerEmail.trim(),
      recipientName: String(customerName).trim(),
      invoiceNumber: invoice.number,
      itemCount: items.length,
      total: invoice.total,
      dueDate: invoice.dueDate,
    });

    // ---- Send the email ---------------------------------------------------
    // sendInvoiceEmail throws on failure, so reaching the next line means the
    // Resend API accepted the message. We capture the returned message id.
    const result = await sendInvoiceEmail({
      to: customerEmail.trim(),
      customerName: String(customerName).trim(),
      invoice,
    });

    console.log('[invoiceRoutes] Email sent successfully:', {
      recipient: customerEmail.trim(),
      invoiceNumber: invoice.number,
      messageId: result?.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Invoice sent successfully',
      messageId: result?.id,
    });
  } catch (error) {
    // ---- Log the full error for debugging ---------------------------------
    console.error('[invoiceRoutes] POST /send failed:', {
      message: error.message,
      stack: error.stack,
      recipient: req.body?.customerEmail,
      invoiceNumber: req.body?.invoice?.number,
    });
    // Distinguish configuration errors (503) from validation errors (400)
    // and provider errors (500).
    const status = error.message.includes('not configured') ? 503 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to send invoice email.',
    });
  }
});

export default router;
