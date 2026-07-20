// Service-role Supabase client for server-side code that must write to the
// database regardless of RLS — currently only the payment webhook /
// reconciliation flow, which runs with no authenticated user session and
// therefore cannot rely on the anon-key + RLS pattern the frontend uses.
//
// NEVER import this from anywhere that could end up in a browser bundle.
// The service-role key bypasses Row Level Security entirely.

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'websocket';

// supabase-js always spins up a realtime client internally, even though
// nothing on this server uses realtime subscriptions — on Node versions
// without a native global WebSocket (<22) that init throws. Passing `ws`
// (Node's standard WebSocket implementation) as the transport avoids that
// entirely, regardless of Node version.
const REALTIME_OPTIONS = { transport: WebSocket };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client = null;

export function isSupabaseAdminConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Lazily-constructed singleton so the server can still boot (and, e.g.,
 * serve /health) even if these env vars aren't set yet in a fresh checkout —
 * the error only surfaces when a webhook actually tries to use the client.
 */
export function getSupabaseAdmin() {
  if (client) return client;

  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in server/.env for payment ' +
      'webhook reconciliation to work. Get the service role key from Supabase ' +
      'Project Settings → API — never the anon key.'
    );
  }

  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: REALTIME_OPTIONS,
  });
  return client;
}