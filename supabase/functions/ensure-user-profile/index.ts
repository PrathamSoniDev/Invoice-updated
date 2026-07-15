import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const PROFILE_SELECT = '*, companies!users_companyId_fkey(*)';

// Must match MODULE_KEYS / DEFAULT_ADMIN_PERMISSIONS in src/utils/permissions.ts
// exactly — ProtectedRoute.tsx checks `user.permissions.includes(moduleKey)`
const DEFAULT_ADMIN_PERMISSIONS = [
  'dashboard',
  'customers',
  'invoices',
  'payment-links',
  'whatsapp',
  'email',
  'reports',
  'settings',
  'admin',
];

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

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[ensure-user-profile] Missing server-side Supabase env vars');
    return json({ error: 'Server misconfiguration' }, 500);
  }

  // ---- 1. Authenticate the caller using their JWT -------------------------
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
    console.error('[ensure-user-profile] auth.getUser failed:', callerError?.message);
    return json({ error: 'Not authenticated' }, 401);
  }

  // ---- 2. Service-role client for all actual DB work -----------------------
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---- 3. Idempotency: return existing profile if present -----------------
  const { data: existing, error: existingError } = await adminClient
    .from('users')
    .select(PROFILE_SELECT)
    .eq('id', caller.id)
    .maybeSingle();

  if (existingError) {
    console.error('[ensure-user-profile] profile lookup failed:', existingError.message);
    return json({ error: 'Failed to check existing profile' }, 500);
  }

  if (existing) {
    return json({ profile: existing }, 200);
  }

  // ---- 4. Resolve company: invited users carry companyId in metadata ------
  const meta = (caller.user_metadata || {}) as Record<string, unknown>;
  const email = caller.email || (meta.email as string) || '';
  const name =
    (meta.name as string) ||
    (meta.full_name as string) ||
    (email ? email.split('@')[0] : 'User');

  let companyId = meta.companyId as string | undefined;

  if (!companyId) {
    const companyName = (meta.companyName as string) || `${name}'s Company`;

    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({ name: companyName, legalName: companyName, email })
      .select('id')
      .maybeSingle();

    if (companyError || !company) {
      console.error('[ensure-user-profile] company creation failed:', companyError?.message);
      return json({ error: companyError?.message ?? 'Failed to create company' }, 500);
    }
    companyId = company.id;
  }

  // ---- 5. Upsert the user profile (handles races without duplicates) ------
  const { data: profile, error: insertError } = await adminClient
    .from('users')
    .upsert(
      {
        id: caller.id,
        companyId,
        name,
        email,
        // The DB enum "UserRole" only accepts uppercase values
        // ('ADMIN','MANAGER','STAFF','BUSINESS','VIEWER'). authStore.ts
        // lowercases this on read via `.toLowerCase()` before comparing
        // against the lowercase UserRole TS type — this MUST stay uppercase
        // here to match the enum and every other write path in the app.
        role: 'ADMIN',
        status: 'ACTIVE',
        permissions: DEFAULT_ADMIN_PERMISSIONS,
      },
      { onConflict: 'id' }
    )
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (insertError) {
    console.error('[ensure-user-profile] profile upsert failed:', insertError.message);
    return json({ error: insertError.message }, 500);
  }

  return json({ profile }, 200);
});