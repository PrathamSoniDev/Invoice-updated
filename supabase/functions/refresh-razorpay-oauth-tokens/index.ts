import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_OAUTH_TOKEN_URL = 'https://auth.razorpay.com/token';

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface GatewaySettingsRow {
  companyId: string;
  razorpayOauthAccessTokenExpiresAt: string | null;
}

interface RazorpayTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
  public_token?: string;
  razorpay_account_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const encryptionKey = Deno.env.get('GATEWAY_CREDENTIALS_ENCRYPTION_KEY') ?? '';
  const clientId = Deno.env.get('RAZORPAY_OAUTH_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('RAZORPAY_OAUTH_CLIENT_SECRET') ?? '';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[refresh-razorpay-oauth-tokens] Missing server-side Supabase env vars');
    return json({ error: 'Server misconfiguration' }, 500);
  }
  if (!encryptionKey) {
    console.error('[refresh-razorpay-oauth-tokens] Missing GATEWAY_CREDENTIALS_ENCRYPTION_KEY');
    return json({ error: 'Server misconfiguration' }, 500);
  }
  if (!clientId || !clientSecret) {
    // Not an error worth alerting on: this app isn't an approved Razorpay
    // Technology Partner yet (KYC pending), so no company can be on the
    // OAuth path yet either — this is just a no-op until that's live.
    console.log('[refresh-razorpay-oauth-tokens] RAZORPAY_OAUTH_CLIENT_ID/SECRET not set — skipping run (OAuth not yet activated).');
    return json({ refreshed: 0, failed: 0, skipped: 'oauth_not_configured' }, 200);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: dueRows, error: dueError } = await adminClient
    .from('gateway_settings')
    .select('companyId, razorpayOauthAccessTokenExpiresAt')
    .eq('razorpayConnectionMethod', 'oauth')
    .eq('razorpayEnabled', true)
    .lte('razorpayOauthAccessTokenExpiresAt', cutoff);

  if (dueError) {
    console.error('[refresh-razorpay-oauth-tokens] failed to load due rows:', dueError.message);
    return json({ error: 'Failed to load gateway settings' }, 500);
  }

  const rows = (dueRows || []) as GatewaySettingsRow[];
  let refreshed = 0;
  const failures: Array<{ companyId: string; reason: string }> = [];

  for (const row of rows) {
    try {
      const { data: refreshToken, error: tokenError } = await adminClient.rpc('get_razorpay_oauth_refresh_token', {
        p_company_id: row.companyId,
        p_key: encryptionKey,
      });
      if (tokenError || !refreshToken) {
        throw new Error(tokenError?.message || 'No refresh token on file');
      }

      const response = await fetch(RAZORPAY_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as Partial<RazorpayTokenResponse> & {
        error?: string;
        error_description?: string;
      };

      if (!response.ok || !data.access_token || !data.refresh_token) {
        throw new Error(data.error_description || data.error || `Refresh failed (${response.status})`);
      }

      const expiresAt = new Date(Date.now() + (data.expires_in ?? 0) * 1000).toISOString();

      const { error: storeError } = await adminClient.rpc('set_razorpay_oauth_tokens', {
        p_company_id: row.companyId,
        p_access_token: data.access_token,
        p_refresh_token: data.refresh_token,
        p_expires_at: expiresAt,
        p_account_id: data.razorpay_account_id ?? null,
        p_key: encryptionKey,
      });
      if (storeError) throw storeError;

      refreshed += 1;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push({ companyId: row.companyId, reason });
      console.error(`[refresh-razorpay-oauth-tokens] refresh failed for company ${row.companyId}:`, reason);

      // The refresh token itself is invalid/expired/revoked — disable
      // Razorpay for this company (rather than leaving it silently broken)
      // and leave an admin-visible trail explaining why.
      await adminClient.from('gateway_settings').update({ razorpayEnabled: false }).eq('companyId', row.companyId);

      await adminClient.from('communication_logs').insert({
        companyId: row.companyId,
        channel: 'EMAIL',
        recipient: 'admin',
        recipientName: 'Company Admin',
        subject: 'Razorpay connection needs to be reconnected',
        body: `Automatic renewal of your Razorpay OAuth connection failed (${reason}). Payments via Razorpay have been paused for this account — please go to Settings → Payment Gateways and reconnect Razorpay.`,
        status: 'FAILED',
        failedReason: reason,
        relatedType: 'razorpay_oauth',
        relatedId: row.companyId,
      });
    }
  }

  return json({ refreshed, failed: failures.length, failures }, 200);
});
