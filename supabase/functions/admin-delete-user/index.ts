// Supabase Edge Function: admin-delete-user
//
// Deletes a user from Supabase Auth (auth.users) using the Admin API (service
// role key). This is required because the browser client cannot call
// `auth.admin.deleteUser()` — the service role key must never be exposed.
//
// Why this exists:
//   The Admin "Delete User" flow previously only soft-deleted the row in
//   `public.users` (set `deletedAt`). The corresponding `auth.users` row was
//   left orphaned. When an admin later tried to recreate a user with the same
//   email, `auth.admin.createUser()` returned 409 Conflict because the email
//   still existed in GoTrue.
//
//   This function accepts a `userId` (the auth.users id) and calls
//   `auth.admin.deleteUser(userId)` to fully remove the auth record. The
//   caller (adminService.deleteUser) is responsible for also updating the
//   `public.users` row.
//
// Security:
//   - The caller MUST be authenticated (a valid JWT in the Authorization header).
//   - The caller MUST have role = 'ADMIN' in the public.users table.
//   - The service role key is read from the function's environment and is
//     never returned to the client.
//
// Request body (JSON):
//   { userId: string }   — the auth.users id to delete (preferred), OR
//   { email: string }    — look up the auth user by email, then delete
//
// Response (JSON):
//   200 { deleted: true }
//   200 { deleted: false, message: string }  — user not found (already deleted)
//   400 { error: string }   — validation error
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
    console.error('[admin-delete-user] Missing server-side Supabase env vars');
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
    return json({ error: 'Not authenticated' }, 401);
  }

  // ---- 2. Authorize: caller must be an ADMIN -----------------------------
  const { data: callerProfile, error: profileError } = await callerClient
    .from('users')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();

  if (profileError) {
    console.error('[admin-delete-user] profile lookup failed:', profileError.message);
    return json({ error: 'Failed to verify admin status' }, 500);
  }

  if (!callerProfile || callerProfile.role !== 'ADMIN') {
    return json({ error: 'Forbidden: admin access required' }, 403);
  }

  // ---- 3. Parse the request body -----------------------------------------
  // Accepts either:
  //   { userId: string }  — the auth.users id to delete (preferred), OR
  //   { email: string }   — look up the auth user by email first, then delete.
  // The email path handles orphaned auth.users rows whose public.users row was
  // already soft-deleted (so we no longer have the userId on hand).
  let body: { userId?: string; email?: string };

  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const userId = (body.userId ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();

  if (!userId && !email) {
    return json({ error: 'userId or email is required' }, 400);
  }

  // ---- 4. Create the service-role admin client ---------------------------
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---- 5. Resolve the target auth user id --------------------------------
  let targetUserId = userId;

  if (!targetUserId && email) {
    // Lookup by email: query auth.users via listUsers() and extract the id.
    console.debug('[admin-delete-user] looking up auth user by email:', email);
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) {
      console.error('[admin-delete-user] listUsers failed:', listError.message);
      return json({ error: 'Failed to look up user by email' }, 500);
    }
    const found = listData?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === email,
    );
    if (!found) {
      console.debug('[admin-delete-user] no auth user found for email:', email);
      return json({ deleted: false, message: 'Auth user not found for email (already deleted?)' }, 200);
    }
    targetUserId = found.id;
    console.debug('[admin-delete-user] found auth user for email "%s" → id: %s', email, targetUserId);
  } else if (targetUserId) {
    // Basic UUID format check (defend in depth).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(targetUserId)) {
      return json({ error: 'Invalid userId format (expected UUID)' }, 400);
    }
  }

  // ---- 6. Delete the auth user via the Admin API -------------------------
  console.debug('[admin-delete-user] deleting auth user:', targetUserId);

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

  if (deleteError) {
    // "User not found" — the auth user may have already been removed.
    if (/not.*found|does.*not.*exist/i.test(deleteError.message)) {
      console.warn('[admin-delete-user] auth user not found (already deleted?):', targetUserId);
      return json({ deleted: false, message: 'Auth user not found (already deleted)' }, 200);
    }
    console.error('[admin-delete-user] admin.deleteUser failed:', deleteError.message);
    return json({ error: deleteError.message }, 500);
  }

  console.log('[admin-delete-user] auth user deleted successfully:', targetUserId);

  // ---- 7. Return success -------------------------------------------------
  return json({ deleted: true }, 200);
});
