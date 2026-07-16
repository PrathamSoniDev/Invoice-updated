// Express routes for Razorpay OAuth (Technology Partner) — lets a company
// connect Razorpay by authorising this app against their account instead of
// typing in a Key ID/Key Secret. 

import { Router } from 'express';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '../services/supabaseAdmin.js';
import { resolveAuthorizedCaller, isCallerAuthConfigured } from '../services/callerAuth.js';
import { signOauthState, verifyOauthState } from '../services/oauthState.js';
import {
  isRazorpayOauthConfigured,
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  revokeToken,
} from '../services/razorpayOauthService.js';

const router = Router();

function frontendUrl(path) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}${path}`;
}

async function ensureGatewaySettingsRow(adminClient, companyId) {
  const { data: existing, error: existingError } = await adminClient
    .from('gateway_settings')
    .select('id')
    .eq('companyId', companyId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (!existing) {
    const { error: insertError } = await adminClient.from('gateway_settings').insert({ companyId });
    if (insertError) throw insertError;
  }
}

router.get('/authorize', async (req, res) => {
  if (!isRazorpayOauthConfigured()) {
    return res
      .status(503)
      .send('Razorpay OAuth is not configured yet (missing RAZORPAY_OAUTH_* env vars). Manual Key ID/Key Secret entry is still available from Settings.');
  }
  if (!isCallerAuthConfigured()) {
    return res.status(500).send('Server misconfiguration: SUPABASE_URL/SUPABASE_ANON_KEY not set.');
  }

  const accessToken = req.query.access_token;

  try {
    const caller = await resolveAuthorizedCaller(accessToken);
    const state = signOauthState({ companyId: caller.companyId });
    return res.redirect(302, buildAuthorizeUrl(state));
  } catch (error) {
    console.error('[razorpay-oauth] authorize failed:', error.message);
    return res.status(error.status || 500).send(error.message || 'Unable to start Razorpay OAuth');
  }
});


// Razorpay redirects the merchant's browser here with either `code` + `state`
// (approved) or `error` + `state` (denied/failed) — see
// https://razorpay.com/docs/partners/technology-partners/onboard-businesses/integrate-oauth/integration-steps/#21-initiate-authorisation-using-url
router.get('/callback', async (req, res) => {
  const { code, state, error: razorpayError } = req.query;

  let companyId;
  try {
    ({ companyId } = verifyOauthState(state));
  } catch (error) {
    console.error('[razorpay-oauth] callback state verification failed:', error.message);
    return res.redirect(302, frontendUrl('/settings?razorpay_oauth=error&reason=invalid_state'));
  }

  if (razorpayError || !code) {
    console.warn('[razorpay-oauth] callback denied/errored:', razorpayError);
    return res.redirect(302, frontendUrl('/settings?razorpay_oauth=denied'));
  }

  if (!isSupabaseAdminConfigured()) {
    console.error('[razorpay-oauth] callback failed: Supabase admin client not configured');
    return res.redirect(302, frontendUrl('/settings?razorpay_oauth=error&reason=server_misconfigured'));
  }

  const encryptionKey = process.env.GATEWAY_CREDENTIALS_ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.error('[razorpay-oauth] callback failed: GATEWAY_CREDENTIALS_ENCRYPTION_KEY not set');
    return res.redirect(302, frontendUrl('/settings?razorpay_oauth=error&reason=server_misconfigured'));
  }

  try {
    // Razorpay's docs note the `code` arrives URL-encoded and must be
    // decoded before use — Express's query parser already decodes it, so no
    // extra step is needed here, but keeping the note since it's easy to
    // accidentally double-handle.
    const tokens = await exchangeCodeForTokens(code);

    const adminClient = getSupabaseAdmin();
    await ensureGatewaySettingsRow(adminClient, companyId);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: rpcError } = await adminClient.rpc('set_razorpay_oauth_tokens', {
      p_company_id: companyId,
      p_access_token: tokens.access_token,
      p_refresh_token: tokens.refresh_token,
      p_expires_at: expiresAt,
      p_account_id: tokens.razorpay_account_id || null,
      p_key: encryptionKey,
    });
    if (rpcError) throw rpcError;

    const { error: updateError } = await adminClient
      .from('gateway_settings')
      .update({ razorpayConnectionMethod: 'oauth', razorpayEnabled: true })
      .eq('companyId', companyId);
    if (updateError) throw updateError;

    console.log(`[razorpay-oauth] company ${companyId} connected Razorpay via OAuth`);
    return res.redirect(302, frontendUrl('/settings?razorpay_oauth=success'));
  } catch (error) {
    console.error('[razorpay-oauth] callback token exchange/storage failed:', error.message);
    return res.redirect(302, frontendUrl('/settings?razorpay_oauth=error&reason=exchange_failed'));
  }
});


router.post('/revoke', async (req, res) => {
  const authHeader = req.get('Authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!isCallerAuthConfigured()) {
    return res.status(500).json({ success: false, message: 'Server misconfiguration' });
  }
  if (!isSupabaseAdminConfigured()) {
    return res.status(500).json({ success: false, message: 'Server misconfiguration' });
  }

  const encryptionKey = process.env.GATEWAY_CREDENTIALS_ENCRYPTION_KEY;
  if (!encryptionKey) {
    return res.status(500).json({ success: false, message: 'Server misconfiguration' });
  }

  try {
    const caller = await resolveAuthorizedCaller(accessToken);
    const adminClient = getSupabaseAdmin();

    if (isRazorpayOauthConfigured()) {
      try {
        const { data: storedToken } = await adminClient.rpc('get_razorpay_oauth_token', {
          p_company_id: caller.companyId,
          p_key: encryptionKey,
        });
        if (storedToken) {
          await revokeToken(storedToken, 'access_token');
        }
      } catch (revokeError) {
        console.warn('[razorpay-oauth] revoke call to Razorpay failed (clearing local tokens anyway):', revokeError.message);
      }
    }

    const { error: clearError } = await adminClient.rpc('clear_razorpay_oauth_tokens', {
      p_company_id: caller.companyId,
    });
    if (clearError) throw clearError;

    return res.json({ success: true });
  } catch (error) {
    console.error('[razorpay-oauth] revoke failed:', error.message);
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to disconnect Razorpay' });
  }
});

router.get('/status', (_req, res) => {
  return res.json({ configured: isRazorpayOauthConfigured() });
});

export default router;
