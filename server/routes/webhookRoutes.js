import { Router } from 'express';
import crypto from 'crypto';
import { razorpay } from '../services/razorpayService.js';
import { verifyChecksum, isPaytmConfigured } from '../services/paytmService.js';
import { reconcilePayment, methodMappers } from '../services/reconciliationService.js';

const router = Router();

// Mirrors src/services/paytmClient.ts's buildPaytmOrderId/parsePaytmOrderId —
// Paytm order IDs are client-chosen (unlike Razorpay, which assigns its own),
// so this app embeds which invoice/payment-link the order is for directly in
// the order ID: "INV_<id>_<timestamp>" or "LNK_<id>_<timestamp>". Keep this
// regex in sync with paytmClient.ts if that format ever changes.
function parsePaytmOrderId(orderId) {
  const match = String(orderId || '').match(/^(INV|LNK)_(.+)_(\d+)$/);
  if (!match) return null;
  return { type: match[1] === 'INV' ? 'invoice' : 'link', entityId: match[2] };
}

// ============================================================================
// POST /api/webhooks/razorpay
// ============================================================================
// Registered in server/index.js with express.raw({ type: 'application/json' })
// scoped to this path — req.body arrives here as a Buffer so the HMAC is
// computed over the exact bytes Razorpay signed, not a re-serialized copy.
router.post('/razorpay', async (req, res) => {
  const rawBody = req.body; // Buffer
  const signature = req.get('X-Razorpay-Signature');
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[webhooks/razorpay] RAZORPAY_WEBHOOK_SECRET is not configured — rejecting webhook.');
    return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
  }
  if (!signature || !Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ success: false, message: 'Missing signature or body' });
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Constant-time comparison to avoid timing side-channels.
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  const isValid =
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!isValid) {
    console.error('[webhooks/razorpay] Signature verification failed — rejecting before any DB access.');
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  // Acknowledge immediately-relevant events only; anything else is a no-op
  // 200 so Razorpay stops retrying it.
  if (event.event !== 'payment.captured' && event.event !== 'payment.failed') {
    return res.json({ success: true, ignored: event.event });
  }

  try {
    const paymentEntity = event.payload?.payment?.entity;
    if (!paymentEntity) {
      return res.status(400).json({ success: false, message: 'Malformed payload: missing payment entity' });
    }

    // Order notes (invoiceId/paymentLinkId) were attached when the order was
    // created in POST /api/payment/create-order — fetch the order fresh
    // rather than trusting payload.payment.entity.notes, since Razorpay does
    // not reliably copy order-level notes onto the payment entity.
    const order = await razorpay.orders.fetch(paymentEntity.order_id);
    const invoiceId = order.notes?.invoiceId || null;
    const paymentLinkId = order.notes?.paymentLinkId || null;

    const result = await reconcilePayment({
      gateway: 'RAZORPAY',
      outcome: event.event === 'payment.captured' ? 'captured' : 'failed',
      transactionId: paymentEntity.id,
      amount: (paymentEntity.amount || 0) / 100,
      method: methodMappers.razorpay(paymentEntity.method),
      invoiceId,
      paymentLinkId,
      rawPayload: event,
    });

    return res.json({ success: true, result });
  } catch (error) {
    console.error('[webhooks/razorpay] reconciliation error:', error);
    // Still 200 here would suppress retries for a transient DB error, which
    // we want retried — so surface a 500 and let Razorpay's retry policy
    // handle it (reconcilePayment is idempotent on transactionId).
    return res.status(500).json({ success: false, message: 'Reconciliation failed' });
  }
});

// ============================================================================
// POST /api/webhooks/paytm
// ============================================================================
// Paytm's checksum is computed over the parsed field set (not raw bytes), so
// this route can use the normal express.json()/urlencoded() body already
// parsed by the global middleware in server/index.js.
router.post('/paytm', async (req, res) => {
  try {
    if (!isPaytmConfigured()) {
      console.error('[webhooks/paytm] PAYTM_MID/PAYTM_MERCHANT_KEY not configured — rejecting webhook.');
      return res.status(503).json({ success: false, message: 'Paytm is not configured' });
    }

    const params = req.body || {};
    const isValid = await verifyChecksum(params, params.CHECKSUMHASH);

    if (!isValid) {
      console.error('[webhooks/paytm] Checksum verification failed — rejecting before any DB access.');
      return res.status(400).json({ success: false, message: 'Invalid checksum' });
    }

    const status = params.STATUS;
    if (status !== 'TXN_SUCCESS' && status !== 'TXN_FAILURE') {
      return res.json({ success: true, ignored: status });
    }

    const parsed = parsePaytmOrderId(params.ORDERID);
    if (!parsed) {
      return res.status(400).json({ success: false, message: 'Could not parse order ID' });
    }

    const result = await reconcilePayment({
      gateway: 'PAYTM',
      outcome: status === 'TXN_SUCCESS' ? 'captured' : 'failed',
      transactionId: params.TXNID,
      amount: parseFloat(params.TXNAMOUNT) || 0,
      method: methodMappers.paytm(params.PAYMENTMODE),
      invoiceId: parsed.type === 'invoice' ? parsed.entityId : null,
      paymentLinkId: parsed.type === 'link' ? parsed.entityId : null,
      rawPayload: params,
    });

    return res.json({ success: true, result });
  } catch (error) {
    console.error('[webhooks/paytm] reconciliation error:', error);
    return res.status(500).json({ success: false, message: 'Reconciliation failed' });
  }
});

export default router;
export { parsePaytmOrderId };
