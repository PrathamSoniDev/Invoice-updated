// Supabase Edge Function: admin-create-user
//
// Creates a new auth user using the Supabase Admin API (service role key).
//
// Why this exists:
//   The Admin "Create User" flow previously called `supabase.auth.signUp()`
//   from the browser. That endpoint is rate-limited per-IP/email and sends a
//   confirmation email, which causes `429 email rate limit exceeded` errors
//   when an admin creates several users in quick succession.
//
//   This Edge Function uses `supabase.auth.admin.createUser()` with the
//   service role key, which:
//     - bypasses the email rate limit (no confirmation email is sent),
//     - sets `email_confirm: true` so the new user can sign in immediately,
//     - runs server-side so the service role key is never exposed to the
//       browser.
//
// IMPORTANT — no pre-existence check:
//   This function does NOT call listUsers() or any manual "does this email
//   already exist?" check before creating the user. Such pre-checks caused
//   false-positive 409 conflicts (stale/paginated user lists, caching, race
//   conditions) that blocked valid user creation even after the user had been
//   fully deleted from Auth.
//
//   Instead we call createUser() directly and let Supabase be the single
//   source of truth for duplicate handling. If the email is genuinely a
//   duplicate, GoTrue returns an error which we surface to the caller.
//
// Security:
//   - The caller MUST be authenticated (a valid JWT in the Authorization
//     header).
//   - The caller MUST have role = 'ADMIN' in the public.users table.
//   - The service role key is read from the function's environment and is
//     never returned to the client.
//
// Request body (JSON):
//   { email: string, password: string, name: string, companyId: string }
//
// Response (JSON):
//   200 { userId: string }
//   400 { error: string }   — validation error or Supabase createUser error
//   401 { error: string }   — not authenticated
//   403 { error: string }   — not an admin
//   500 { error: string }   — unexpected failure

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

  if (!callerProfile || callerProfile.role !== 'ADMIN') {
    return json({ error: 'Forbidden: admin access required' }, 403);
  }

  // ---- 3. Parse & validate the request body ------------------------------
  let body: {
    email?: string;
    password?: string;
    name?: string;
    companyId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = (body.email ?? '').trim();
  const password = body.password ?? '';
  const name = (body.name ?? '').trim();
  const companyId = body.companyId ?? '';

  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'Invalid email format' }, 400);
  }
  if (!password || password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, 400);
  }
  if (!name) {
    return json({ error: 'Name is required' }, 400);
  }
  if (!companyId) {
    return json({ error: 'Company ID is required' }, 400);
  }

  // ---- 4. Create the auth user via the Admin API -------------------------
  // Direct create-only flow. We do NOT pre-check whether the email already
  // exists (no listUsers(), no manual existence check). Supabase is the
  // single source of truth for duplicate handling — if the email is a genuine
  // duplicate, createUser() returns an error which we surface below.
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.debug('[admin-create-user] createUser payload:', JSON.stringify({ email, name, companyId }));

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, companyId },
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

  // ---- 5. Return the new auth user id ------------------------------------
  return json({ userId: authData.user.id }, 200);
});
