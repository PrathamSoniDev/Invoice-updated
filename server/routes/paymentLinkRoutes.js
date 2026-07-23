// Express router for payment-link-related endpoints.
// All email sending is delegated to the backend emailService so the Resend API key never leaves the server.

import { Router } from 'express';
import { sendPaymentLinkEmail } from '../services/emailService.js';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '../services/supabaseAdmin.js';

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

router.get('/public/:slug', async (req, res) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return res.status(503).json({ success: false, message: 'Payment lookup is not configured.' });
    }

    const { slug } = req.params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('payment_links')
      .select('id, slug, title, description, amount, currency, status, expiresAt, gateway, customers!payment_links_customerId_fkey(name)')
      .eq('slug', slug)
      .is('deletedAt', null)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: 'Payment link not found.' });
    }

    const isExpired = data.expiresAt ? new Date(data.expiresAt).getTime() < Date.now() : false;

    return res.json({
      success: true,
      paymentLink: {
        id: data.id,
        slug: data.slug,
        title: data.title,
        description: data.description,
        amount: parseFloat(data.amount) || 0,
        currency: data.currency,
        status: isExpired && data.status === 'PENDING' ? 'EXPIRED' : data.status,
        expiresAt: data.expiresAt,
        gateway: data.gateway,
        customerName: data.customers?.name || null,
      },
    });
  } catch (error) {
    console.error('[paymentLinkRoutes] GET /public/:slug failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load payment link.' });
  }
});


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
