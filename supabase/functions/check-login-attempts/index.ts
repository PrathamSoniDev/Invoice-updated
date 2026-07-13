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

const MAX_ATTEMPTS_PER_MINUTE = 5;
const WINDOW_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Called two ways from authStore.ts, both against this same function:
//
//   1. BEFORE signInWithPassword — POST { email }  (no `outcome`)
//      Returns { allowed: boolean, remainingAttempts? }. authStore aborts
//      with a friendly error if `allowed` is false, never calling
//      signInWithPassword at all.
//
//   2. AFTER signInWithPassword resolves — POST { email, outcome: 'success' | 'failure' }
//      Records the attempt. On 'success', clears prior attempts for this
//      identifier (the "reset the counter on success" requirement) so a
//      legitimate user who mistyped their password a couple of times isn't
//      penalized on their next login.
//
// The IP is read from request headers server-side (never trusted from the
// client body) so a caller can't evade rate limiting by simply lying about
// their IP.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[check-login-attempts] Missing server-side Supabase env vars');
    return json({ error: 'Server misconfigured' }, 500);
  }
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: { email?: string; outcome?: 'success' | 'failure' };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'A valid email is required' }, 400);
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';
  const identifier = `${email}:${ip}`;
  const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

  if (body.outcome) {
    // ---- Record call (after signInWithPassword resolved) ----
    if (body.outcome === 'success') {
      const { error: deleteError } = await supabase
        .from('login_attempts')
        .delete()
        .eq('identifier', identifier);
      if (deleteError) console.error('[check-login-attempts] Failed to reset counter:', deleteError);
      return json({ recorded: true, reset: true }, 200);
    }

    const { error: insertError } = await supabase.from('login_attempts').insert({
      identifier,
      email,
      ip,
      success: false,
    });
    if (insertError) console.error('[check-login-attempts] Failed to record attempt:', insertError);
    return json({ recorded: true }, 200);
  }

  // ---- Check call (before signInWithPassword) ----
  const { count, error: countError } = await supabase
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('success', false)
    .gte('createdAt', windowStart);

  if (countError) {
    console.error('[check-login-attempts] Failed to count attempts:', countError);
    // Fail open rather than locking legitimate users out because of a
    // transient DB error — the login attempt itself is still gated by
    // Supabase Auth's own password check either way.
    return json({ allowed: true }, 200);
  }

  const attempts = count ?? 0;
  if (attempts >= MAX_ATTEMPTS_PER_MINUTE) {
    return json(
      {
        allowed: false,
        message: 'Too many login attempts. Please wait a minute before trying again.',
      },
      429,
    );
  }

  return json({ allowed: true, remainingAttempts: MAX_ATTEMPTS_PER_MINUTE - attempts }, 200);
});
