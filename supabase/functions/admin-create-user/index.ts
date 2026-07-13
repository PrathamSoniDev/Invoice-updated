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

// Minimal RFC-compliant email check (the service layer also validates, but we
// defend in depth so a malformed value never reaches the Admin API).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight — must be the FIRST thing checked so no other code
  // runs before we return the CORS headers.
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[admin-create-user] Missing server-side Supabase env vars');
    return json({ error: 'Server misconfiguration' }, 500);
  }

  // ---- 1. Authenticate the caller using their JWT -------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization header' }, 401);
  }

  // Client built with the caller's JWT so RLS applies and we can read their
  // profile to confirm they are an admin.
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

  // ---- 2. Authorize: caller must be an ADMIN -----------------------------
  const { data: callerProfile, error: profileError } = await callerClient
    .from('users')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();

  if (profileError) {
    console.error('[admin-create-user] profile lookup failed:', profileError.message);
    return json({ error: 'Failed to verify admin status' }, 500);
  }

  const isAdmin =
  callerProfile &&
  ['ADMIN', 'SUPER_ADMIN'].includes(callerProfile.role);

  if (!isAdmin) {
  return json(
    { error: 'Forbidden: admin access required' },
    403
  );
  }

  // ---- 3. Parse & validate the request body ------------------------------
  let body: {
    email?: string;
    password?: string;
    name?: string;
    companyId?: string;
    role?: string;
    companyName?: string;
    status?: string;
    phone?: string;
    permissions?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = (body.email ?? '').trim();
  const password = body.password ?? '';
  const name = (body.name ?? '').trim();
  const requestedCompanyId = body.companyId ?? '';
  const role = (body.role ?? '').toUpperCase();
  const companyName = (body.companyName ?? '').trim();

  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'Invalid email format' }, 400);
  }
  if (!password || password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, 400);
  }
  if (!name) {
    return json({ error: 'Name is required' }, 400);
  }
  if (!requestedCompanyId) {
    return json({ error: 'Company ID is required' }, 400);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---- 4. Resolve the EFFECTIVE company ------------------------------------
  // A new Admin gets their own, brand-new company (independent tenant) —
  let effectiveCompanyId = requestedCompanyId;

  if (role === 'ADMIN' && companyName) {
    const { data: newCompany, error: companyError } = await adminClient
      .from('companies')
      .insert({ name: companyName, legalName: companyName, email })
      .select('id')
      .maybeSingle();

    if (companyError || !newCompany) {
      console.error('[admin-create-user] new company creation failed:', companyError?.message);
      return json({ error: companyError?.message ?? 'Failed to create company for new admin' }, 500);
    }
    effectiveCompanyId = newCompany.id;
  }

  // ---- 5. Create the auth user via the Admin API -------------------------
  // Direct create-only flow. We do NOT pre-check whether the email already

  console.debug('[admin-create-user] createUser payload:', JSON.stringify({ email, name, companyId: effectiveCompanyId, role }));

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, companyId: effectiveCompanyId },
  });

  // Handle errors ONLY from the Supabase response. No manual "user exists"
  // checks are performed.
  if (authError) {
    console.error('[admin-create-user] admin.createUser failed:', authError.message);
    return json({ error: authError.message }, 400);
  }

  if (!authData.user) {
    return json({ error: 'Failed to create auth user' }, 500);
  }

  // ---- 6. Create the `public.users` profile row using the service role ---
  // This MUST happen here (service role), not from the browser with the
  // caller's own session. The RLS policy `insert_own_users` only allows
  // `"companyId" = public.get_company_id()` (i.e. the caller's own company),
  // so a client-side insert would be rejected by RLS whenever a brand-new
  // Admin/company was just created above — which is exactly the scenario
  // this function exists for. Doing the insert here with the service role
  // bypasses that mismatch entirely.
  const { data: profile, error: profileInsertError } = await adminClient
    .from('users')
    .insert({
      id: authData.user.id,
      companyId: effectiveCompanyId,
      name,
      email,
      role: role || 'STAFF',
      status: body.status ? body.status.toUpperCase() : 'INVITED',
      phone: body.phone || null,
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
    })
    .select('*, companies!users_companyId_fkey(id, name)')
    .maybeSingle();

  if (profileInsertError || !profile) {
    console.error('[admin-create-user] profile insert failed:', profileInsertError?.message);
    // Roll back the orphaned auth user so retrying with the same email works.
    await adminClient.auth.admin.deleteUser(authData.user.id).catch((e) =>
      console.error('[admin-create-user] rollback deleteUser failed:', e)
    );
    return json({ error: profileInsertError?.message ?? 'Failed to create user profile' }, 500);
  }

  // ---- 7. Return the new auth user id + effective company id + profile ---
  return json({ userId: authData.user.id, companyId: effectiveCompanyId, profile }, 200);
});
