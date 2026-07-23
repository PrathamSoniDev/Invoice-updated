import { Router } from 'express';
import crypto from 'crypto';
import { razorpay } from '../services/razorpayService.js';
import { verifyChecksum, isPaytmConfigured } from '../services/paytmService.js';
import { reconcilePayment, methodMappers } from '../services/reconciliationService.js';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '../services/supabaseAdmin.js';

const router = Router();
function parsePaytmOrderId(orderId) {
  const match = String(orderId || '').match(/^(INV|LNK)_(.+)_(\d+)$/);
  if (!match) return null;
  return { type: match[1] === 'INV' ? 'invoice' : 'link', entityId: match[2] };
}

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

  
  if (event.event === 'account.app.authorization_revoked') {
    return handleAuthorizationRevoked(event, res);
  }

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


async function handleAuthorizationRevoked(event, res) {
  const accountId = event.account_id;
  if (!accountId) {
    return res.status(400).json({ success: false, message: 'Malformed payload: missing account_id' });
  }

  if (!isSupabaseAdminConfigured()) {
    console.error('[webhooks/razorpay] authorization_revoked: Supabase admin client not configured.');
    return res.status(500).json({ success: false, message: 'Server misconfiguration' });
  }

  try {
    const adminClient = getSupabaseAdmin();

    const { data: row, error: lookupError } = await adminClient
      .from('gateway_settings')
      .select('companyId')
      .eq('razorpayOauthAccountId', accountId)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!row) {
      // Nothing on file for this account_id (e.g. already disconnected via
      // our own "Disconnect" button, which clears razorpayOauthAccountId) —
      // acknowledge so Razorpay doesn't keep retrying.
      return res.json({ success: true, ignored: 'no_matching_company' });
    }

    const { error: clearError } = await adminClient.rpc('clear_razorpay_oauth_tokens', {
      p_company_id: row.companyId,
    });
    if (clearError) throw clearError;

    await adminClient.from('communication_logs').insert({
      companyId: row.companyId,
      channel: 'EMAIL',
      recipient: 'admin',
      recipientName: 'Company Admin',
      subject: 'Razorpay was disconnected',
      body: 'Your Razorpay account owner revoked this app\u2019s access from the Razorpay dashboard. Payments via Razorpay have been paused \u2014 reconnect from Settings \u2192 Payment Gateways whenever you\u2019re ready.',
      status: 'SENT',
      relatedType: 'razorpay_oauth',
      relatedId: row.companyId,
    });

    console.log(`[webhooks/razorpay] account ${accountId} (company ${row.companyId}) revoked OAuth authorization.`);
    return res.json({ success: true });
  } catch (error) {
    console.error('[webhooks/razorpay] authorization_revoked handling failed:', error);
    // 500 so Razorpay retries — clearing tokens is idempotent, safe to retry.
    return res.status(500).json({ success: false, message: 'Failed to process revocation' });
  }
}

export default router;
export { parsePaytmOrderId };
