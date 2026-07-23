// Authenticates a Supabase JWT from the frontend 


import { createClient } from '@supabase/supabase-js';
import WebSocket from 'websocket';

// See the matching comment in supabaseAdmin.js — avoids a "native WebSocket not found" crash on Node <22.
const REALTIME_OPTIONS = { transport: WebSocket };

const ALLOWED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

export function isCallerAuthConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

/**
 * @param {string} accessToken the caller's Supabase JWT
 * @returns {Promise<{ userId: string, companyId: string, role: string }>}
 * @throws Error with a `status` property (401/403/500) on any failure, so
 * callers can map it straight to an HTTP response.
 */
export async function resolveAuthorizedCaller(accessToken) {
  if (!isCallerAuthConfigured()) {
    const err = new Error('Server misconfiguration: SUPABASE_URL/SUPABASE_ANON_KEY not set');
    err.status = 500;
    throw err;
  }
  if (!accessToken) {
    const err = new Error('Missing authorization token');
    err.status = 401;
    throw err;
  }

  const callerClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: REALTIME_OPTIONS,
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();

  if (callerError || !caller) {
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }

  const { data: profile, error: profileError } = await callerClient
    .from('users')
    .select('role, companyId')
    .eq('id', caller.id)
    .maybeSingle();

  if (profileError || !profile) {
    const err = new Error('Failed to resolve caller profile');
    err.status = 500;
    throw err;
  }

  if (!ALLOWED_ROLES.has(profile.role)) {
    const err = new Error('Forbidden: admin access required');
    err.status = 403;
    throw err;
  }

  return { userId: caller.id, companyId: profile.companyId, role: profile.role };
}