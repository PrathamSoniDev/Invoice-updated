import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface SaveGatewayBody {
  gateway?: string;
  enabled?: boolean;
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  merchantId?: string;
  merchantKey?: string;
  environment?: 'TEST' | 'PROD';
  upiId?: string;
}

const ALLOWED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const encryptionKey = Deno.env.get('GATEWAY_CREDENTIALS_ENCRYPTION_KEY') ?? '';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[save-gateway-credentials] Missing server-side Supabase env vars');
    return json({ error: 'Server misconfiguration' }, 500);
  }
  if (!encryptionKey) {
    console.error('[save-gateway-credentials] Missing GATEWAY_CREDENTIALS_ENCRYPTION_KEY');
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

  // ---- 2. Authorize: caller must be ADMIN/SUPER_ADMIN for their company ----
  const { data: callerProfile, error: profileError } = await callerClient
    .from('users')
    .select('role, companyId')
    .eq('id', caller.id)
    .maybeSingle();

  if (profileError) {
    console.error('[save-gateway-credentials] profile lookup failed:', profileError.message);
    return json({ error: 'Failed to verify permissions' }, 500);
  }
  if (!callerProfile || !ALLOWED_ROLES.has(callerProfile.role)) {
    return json({ error: 'Forbidden: admin access required' }, 403);
  }

  const companyId = callerProfile.companyId as string;

  // ---- 3. Parse and validate the body ---------------------------------------
  let body: SaveGatewayBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const gateway = body.gateway;
  if (gateway !== 'razorpay' && gateway !== 'paytm') {
    return json({ error: "gateway must be 'razorpay' or 'paytm'" }, 400);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---- 4. Ensure a gateway_settings row exists for this company -------------
  const { data: existing, error: existingError } = await adminClient
    .from('gateway_settings')
    .select('id')
    .eq('companyId', companyId)
    .maybeSingle();

  if (existingError) {
    console.error('[save-gateway-credentials] lookup failed:', existingError.message);
    return json({ error: 'Failed to load gateway settings' }, 500);
  }

  if (!existing) {
    const { error: insertError } = await adminClient
      .from('gateway_settings')
      .insert({ companyId });
    if (insertError) {
      console.error('[save-gateway-credentials] insert failed:', insertError.message);
      return json({ error: 'Failed to create gateway settings' }, 500);
    }
  }

  // ---- 5. Update the non-secret fields ---------------------------------------
  const updateData: Record<string, unknown> = {};
  if (gateway === 'razorpay') {
    if (body.enabled !== undefined) updateData.razorpayEnabled = body.enabled;
    if (body.keyId !== undefined) updateData.razorpayKeyId = body.keyId;
    if (body.webhookSecret !== undefined) updateData.razorpayWebhook = body.webhookSecret;
    if (body.upiId !== undefined) updateData.razorpayUpiId = body.upiId;
  } else {
    if (body.enabled !== undefined) updateData.paytmEnabled = body.enabled;
    if (body.merchantId !== undefined) updateData.paytmMerchantId = body.merchantId;
    if (body.environment !== undefined) updateData.paytmEnvironment = body.environment;
    if (body.upiId !== undefined) updateData.paytmUpiId = body.upiId;
  }

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await adminClient
      .from('gateway_settings')
      .update(updateData)
      .eq('companyId', companyId);
    if (updateError) {
      console.error('[save-gateway-credentials] update failed:', updateError.message);
      return json({ error: 'Failed to update gateway settings' }, 500);
    }
  }

  // ---- 6. Encrypt + store the secret, only if a new one was supplied --------
  const newSecret = gateway === 'razorpay' ? body.keySecret : body.merchantKey;
  if (newSecret !== undefined && newSecret.trim().length > 0) {
    const { error: rpcError } = await adminClient.rpc('set_gateway_secret', {
      p_company_id: companyId,
      p_gateway: gateway,
      p_secret: newSecret.trim(),
      p_key: encryptionKey,
    });
    if (rpcError) {
      console.error('[save-gateway-credentials] set_gateway_secret failed:', rpcError.message);
      return json({ error: 'Failed to store credentials securely' }, 500);
    }
  }

  console.log(`[save-gateway-credentials] ${gateway} settings updated for company ${companyId}`);
  return json({ success: true }, 200);
});
