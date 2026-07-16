// Supabase Edge Function: get-gateway-status
//
// Phase 1 (encrypt gateway credentials at rest). Returns the current
// company's gateway configuration WITHOUT ever exposing a decrypted secret:
// `keySecretPreview` / `merchantKeyPreview` are masked (e.g. "••••••••3f9a"),
// produced entirely inside the `get_gateway_secret_preview` SQL function —
// the full plaintext secret never leaves the database, let alone this
// function or the frontend.
//
// Request: POST with an empty body (or GET) + Authorization: Bearer <jwt>
//
// Response (JSON): 200
//   {
//     razorpay: { enabled, keyId, webhookSecret, upiId, keySecretPreview,
//                 connectionMethod: 'manual' | 'oauth',
//                 oauth: null | { accountId, connected, expiresAt, reconnectNeeded } },
//     paytm:    { enabled, merchantId, environment, upiId, merchantKeyPreview },
//   }
// (webhookSecret is intentionally still returned in full for now — it's used
// to display/copy the webhook URL config, not treated as the primary
// merchant secret. It can be masked the same way as the key secrets later
// if desired.)
//
// Phase E (Razorpay OAuth): `razorpay.oauth` is null when connectionMethod
// is 'manual' (nothing to report). When connectionMethod is 'oauth', it
// never includes a token value — only enough for the Settings page to show
// a "reconnect needed" banner: `reconnectNeeded` is true if the stored
// access token has already expired (the daily refresh cron in Phase C
// failed to renew it, e.g. because the refresh token itself was revoked/
// expired) or is missing entirely.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const encryptionKey = Deno.env.get('GATEWAY_CREDENTIALS_ENCRYPTION_KEY') ?? '';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[get-gateway-status] Missing server-side Supabase env vars');
    return json({ error: 'Server misconfiguration' }, 500);
  }
  if (!encryptionKey) {
    console.error('[get-gateway-status] Missing GATEWAY_CREDENTIALS_ENCRYPTION_KEY');
    return json({ error: 'Server misconfiguration' }, 500);
  }

  // ---- 1. Authenticate the caller ------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization header' }, 401);
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();

  if (callerError || !caller) {
    return json({ error: 'Not authenticated' }, 401);
  }

  // ---- 2. Resolve the caller's company (any authenticated company member
  //         can view masked status; only ADMIN/SUPER_ADMIN can change it via
  //         save-gateway-credentials) --------------------------------------
  const { data: callerProfile, error: profileError } = await callerClient
    .from('users')
    .select('companyId')
    .eq('id', caller.id)
    .maybeSingle();

  if (profileError || !callerProfile) {
    console.error('[get-gateway-status] profile lookup failed:', profileError?.message);
    return json({ error: 'Failed to resolve company' }, 500);
  }

  const companyId = callerProfile.companyId as string;

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---- 3. Load the non-secret columns ---------------------------------------
  const { data: settings, error: settingsError } = await adminClient
    .from('gateway_settings')
    .select(
      'razorpayEnabled, razorpayKeyId, razorpayWebhook, razorpayUpiId, razorpayConnectionMethod, razorpayOauthAccountId, razorpayOauthAccessTokenExpiresAt, paytmEnabled, paytmMerchantId, paytmEnvironment, paytmUpiId',
    )
    .eq('companyId', companyId)
    .maybeSingle();

  if (settingsError) {
    console.error('[get-gateway-status] settings lookup failed:', settingsError.message);
    return json({ error: 'Failed to load gateway settings' }, 500);
  }

  // ---- 4. Get masked previews of the secrets (never the full plaintext) -----
  const [razorpayPreviewResult, paytmPreviewResult] = await Promise.all([
    adminClient.rpc('get_gateway_secret_preview', {
      p_company_id: companyId,
      p_gateway: 'razorpay',
      p_key: encryptionKey,
    }),
    adminClient.rpc('get_gateway_secret_preview', {
      p_company_id: companyId,
      p_gateway: 'paytm',
      p_key: encryptionKey,
    }),
  ]);

  if (razorpayPreviewResult.error) {
    console.error('[get-gateway-status] razorpay preview failed:', razorpayPreviewResult.error.message);
  }
  if (paytmPreviewResult.error) {
    console.error('[get-gateway-status] paytm preview failed:', paytmPreviewResult.error.message);
  }

  const connectionMethod = (settings?.razorpayConnectionMethod ?? 'manual') as 'manual' | 'oauth';
  const oauthExpiresAt = settings?.razorpayOauthAccessTokenExpiresAt ?? null;

  return json(
    {
      razorpay: {
        enabled: settings?.razorpayEnabled ?? false,
        keyId: settings?.razorpayKeyId ?? '',
        webhookSecret: settings?.razorpayWebhook ?? '',
        upiId: settings?.razorpayUpiId ?? '',
        keySecretPreview: razorpayPreviewResult.data ?? null,
        connectionMethod,
        oauth:
          connectionMethod === 'oauth'
            ? {
                accountId: settings?.razorpayOauthAccountId ?? null,
                connected: Boolean(settings?.razorpayEnabled),
                expiresAt: oauthExpiresAt,
                reconnectNeeded: !oauthExpiresAt || new Date(oauthExpiresAt).getTime() <= Date.now(),
              }
            : null,
      },
      paytm: {
        enabled: settings?.paytmEnabled ?? false,
        merchantId: settings?.paytmMerchantId ?? '',
        environment: settings?.paytmEnvironment ?? 'TEST',
        upiId: settings?.paytmUpiId ?? '',
        merchantKeyPreview: paytmPreviewResult.data ?? null,
      },
    },
    200,
  );
});
