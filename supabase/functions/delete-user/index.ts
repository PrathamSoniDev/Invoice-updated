// Supabase Edge Function: delete-user
//
// Fully deletes a user from BOTH Supabase Auth (auth.users) AND all
// application tables (public.users + related tables).
//
// Why this exists:
//   Previously, deleting a user from the UI only soft-deleted the public.users
//   row (set deletedAt). The auth.users row was left orphaned, which caused
//   409 Conflict errors when recreating a user with the same email. The
//   developer had to manually delete users in the Supabase dashboard.
//
//   This function makes the entire lifecycle automatic:
//     UI delete → this Edge Function → auth.users + all app tables cleaned
//
// What it does (in order):
//   1. Authenticates the caller (JWT) and verifies they are an ADMIN.
//   2. Deletes the auth.users row via auth.admin.deleteUser(userId).
//      - If this fails, we STOP and return an error (auth is the source of
//        truth — if we can't delete it, the email will still be blocked).
//   3. Hard-deletes the public.users row (this frees the UNIQUE(companyId,
//      email) constraint so the email can be reused).
//      - Tables with ON DELETE CASCADE (sessions, refresh_tokens, etc.) are
//        automatically cleaned by Postgres when the users row is deleted.
//      - Tables with plain REFERENCES (no cascade) are nullified first so the
//        hard delete doesn't fail on FK violations.
//   4. Returns a summary of what succeeded/failed.
//
// Security:
//   - The caller MUST be authenticated (valid JWT in Authorization header).
//   - The caller MUST have role = 'ADMIN' or 'SUPER_ADMIN' in public.users.
//   - The service role key is read from the function environment and is NEVER
//     returned to the client.
//
// Request body (JSON):
//   { userId: string, email?: string }
//   - userId is required (the auth.users / public.users id).
//   - email is optional (used for logging only).
//
// Response (JSON):
//   200 { deleted: true, authDeleted: bool, dbDeleted: bool }
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight — must be the FIRST thing checked.
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
    console.error('[delete-user] Missing server-side Supabase env vars');
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
    console.error('[delete-user] profile lookup failed:', profileError.message);
    return json({ error: 'Failed to verify admin status' }, 500);
  }

  if (!callerProfile || !['ADMIN', 'SUPER_ADMIN'].includes(callerProfile.role)) {
    return json({ error: 'Forbidden: admin access required' }, 403);
  }

  // ---- 3. Parse & validate the request body ------------------------------
  let body: { userId?: string; email?: string };

  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const userId = (body.userId ?? '').trim();
  const email = (body.email ?? '').trim();

  if (!userId) {
    return json({ error: 'userId is required' }, 400);
  }
  if (!UUID_RE.test(userId)) {
    return json({ error: 'Invalid userId format (expected UUID)' }, 400);
  }

  console.debug('[delete-user] starting deletion for userId:', userId, email ? `(${email})` : '');

  // ---- 4. Create the service-role admin client ---------------------------
  // This client bypasses RLS and can call auth.admin.deleteUser().
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---- 5. Delete the auth.users row via the Admin API -------------------
  // This is the CRITICAL step. If we can't delete the auth user, the email
  // will remain blocked in GoTrue and recreating the user will 409. So if
  // this fails (and the user genuinely exists), we STOP and return an error.
  let authDeleted = false;
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    // "User not found" — the auth user may have already been removed. This is
    // OK; we still proceed to clean up the database tables.
    if (/not.*found|does.*not.*exist/i.test(authDeleteError.message)) {
      console.warn('[delete-user] auth user not found (already deleted?):', userId);
      authDeleted = false;
    } else {
      // Genuine failure — STOP. The email is still blocked in Auth.
      console.error('[delete-user] auth deletion FAILED (stopping):', authDeleteError.message);
      return json(
        { error: `Failed to delete auth user: ${authDeleteError.message}` },
        500,
      );
    }
  } else {
    authDeleted = true;
    console.log('[delete-user] auth user deleted successfully:', userId);
  }

  // ---- 6. Nullify FK references (no-cascade tables) ---------------------
  // Several tables reference users(id) WITHOUT ON DELETE CASCADE. If we try to
  // hard-delete the users row, Postgres will block it with a FK violation. We
  // nullify these columns first so the hard delete succeeds. Failures here are
  // logged but do NOT stop the cleanup (best-effort).
  //
  // Tables with plain REFERENCES users(id) (no cascade):
  //   invoices.createdById, invoices.updatedById
  //   payments.createdById, payments.updatedById
  //   invoice_activity.userId
  //   communications.createdById
  //   file_uploads.uploadedById
  //   invoice_template_versions.changedBy
  //   audit_logs.userId
  //   activity_logs.userId
  //   api_keys.createdById
  //   integration_logs.userId
  //   webhook_events.userId
  //   scheduled_jobs.createdById
  const nullifyTables: { table: string; column: string }[] = [
    { table: 'invoices', column: 'createdById' },
    { table: 'invoices', column: 'updatedById' },
    { table: 'payments', column: 'createdById' },
    { table: 'payments', column: 'updatedById' },
    { table: 'invoice_activity', column: 'userId' },
    { table: 'communications', column: 'createdById' },
    { table: 'file_uploads', column: 'uploadedById' },
    { table: 'invoice_template_versions', column: 'changedBy' },
    { table: 'audit_logs', column: 'userId' },
    { table: 'activity_logs', column: 'userId' },
    { table: 'api_keys', column: 'createdById' },
    { table: 'integration_logs', column: 'userId' },
    { table: 'webhook_events', column: 'userId' },
    { table: 'scheduled_jobs', column: 'createdById' },
  ];

  for (const { table, column } of nullifyTables) {
    const { error: nullifyError } = await adminClient
      .from(table)
      .update({ [column]: null })
      .eq(column, userId);
    if (nullifyError) {
      // Non-blocking: log and continue. The hard delete may still fail on this
      // FK, but we try all tables before giving up.
      console.warn(`[delete-user] nullify ${table}.${column} failed:`, nullifyError.message);
    }
  }

  // ---- 7. Hard-delete the public.users row ------------------------------
  // This frees the UNIQUE(companyId, email) constraint so the email can be
  // reused. Tables with ON DELETE CASCADE (sessions, refresh_tokens,
  // password_reset_tokens, user_preferences, user_security, user_devices,
  // invoice_template_usage, notifications) are automatically cleaned by
  // Postgres.
  let dbDeleted = false;
  const { error: dbDeleteError } = await adminClient
    .from('users')
    .delete()
    .eq('id', userId);

  if (dbDeleteError) {
    // Non-blocking: the auth user is already gone (or was never there). The
    // email is free in Auth, which is the critical part. Log the DB error so
    // the developer knows the public.users row may still exist.
    console.error('[delete-user] DB users deletion failed:', dbDeleteError.message);
    dbDeleted = false;
  } else {
    dbDeleted = true;
    console.log('[delete-user] public.users row deleted successfully:', userId);
  }

  // ---- 8. Return summary -------------------------------------------------
  console.log('[delete-user] complete:', { userId, authDeleted, dbDeleted });

  return json({ deleted: true, authDeleted, dbDeleted }, 200);
});
