// Express router for payment-link-related endpoints.
// All email sending is delegated to the backend emailService so the Resend API key never leaves the server.

import { Router } from 'express';
import { sendPaymentLinkEmail } from '../services/emailService.js';

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
 * POST /api/payment-links/send
 *
 * Request body:
 *   {
 *     "customerEmail": "buyer@example.com",
 *     "customerName": "Jane Doe",
 *     "paymentLink": {
 *       "linkId": "AbCdEf123456",
 *       "amount": 5000,
 *       "currency": "INR",
 *       "url": "https://.../pay/AbCdEf123456",
 *       "expiryDate": "2026-08-15",
 *       "description": "Consulting services"
 *     }
 *   }
 *
 * Success response (200):
 *   { "success": true, "message": "Payment link sent successfully" }
 */
router.post('/send', async (req, res) => {
  console.log('[paymentLinkRoutes] POST /send received:', {
    customerEmail: req.body?.customerEmail,
    customerName: req.body?.customerName,
    linkId: req.body?.paymentLink?.linkId,
    amount: req.body?.paymentLink?.amount,
  });

  try {
    const { customerEmail, customerName, paymentLink } = req.body ?? {};

    const missing = [];
    if (!customerEmail) missing.push('customerEmail');
    if (!customerName) missing.push('customerName');
    if (!paymentLink) missing.push('paymentLink');

    if (missing.length > 0) {
      console.warn('[paymentLinkRoutes] Validation failed — missing fields:', missing);
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(', ')}`,
      });
    }

    if (!isValidEmail(customerEmail)) {
      console.warn('[paymentLinkRoutes] Validation failed — invalid email:', customerEmail);
      return res.status(400).json({
        success: false,
        message: 'customerEmail must be a valid email address.',
      });
    }

    if (!paymentLink.url || typeof paymentLink.url !== 'string') {
      console.warn('[paymentLinkRoutes] Validation failed — invalid paymentLink.url:', paymentLink.url);
      return res.status(400).json({
        success: false,
        message: 'paymentLink.url is required and must be a string.',
      });
    }

    const result = await sendPaymentLinkEmail({
      to: customerEmail.trim(),
      customerName: String(customerName).trim(),
      paymentLink,
    });

    console.log('[paymentLinkRoutes] Email sent successfully:', {
      recipient: customerEmail.trim(),
      linkId: paymentLink.linkId,
      messageId: result?.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment link sent successfully',
      messageId: result?.id,
    });
  } catch (error) {
    console.error('[paymentLinkRoutes] POST /send failed:', {
      message: error.message,
      stack: error.stack,
      recipient: req.body?.customerEmail,
      linkId: req.body?.paymentLink?.linkId,
    });
    const status = error.message.includes('not configured') ? 503 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to send payment link email.',
    });
  }
});

export default router;
