/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_ADMIN_PERMISSIONS } from '@/utils/permissions';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'pkce',
  },
});

export interface UserProfile {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  status: string;
  permissions: string[];
  lastActiveAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  companies?: any;
}

/**
 * Fetch a user profile by id using `.maybeSingle()`.
 *
 * `.single()` throws a `406 Not Acceptable` (PGRST116) when zero rows match,
 * which is exactly what happens when an authenticated `auth.users` row has no
 * matching `public.users` profile. `.maybeSingle()` returns `null` instead, so
 * callers can handle the missing-profile case gracefully.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, companies!users_companyId_fkey(*)')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[fetchUserProfile] Error fetching profile:', error.message, error);
    return null;
  }
  return (data as UserProfile) ?? null;
}

/**
 * Ensure that a `public.users` profile row exists for the given auth user.
 *
 * - If a profile already exists, it is returned unchanged (no duplicates).
 * - If no profile exists (e.g. the auth user was created without a profile, or
 *   a previous profile insert failed silently), one is created:
 *     * Admin-invited users carry `companyId` in their auth metadata, which is
 *       reused so the user joins the inviting company.
 *     * Self-registered users get a new company created for them.
 * - The insert uses `upsert` with `onConflict: 'id'` so concurrent calls
 *   (e.g. `onAuthStateChange` firing while `login` runs) never create
 *   duplicate profiles.
 * - Any Supabase error is logged with its real message instead of being
 *   swallowed, so RLS / constraint failures are visible.
 *
 * This is the single source of truth that permanently fixes the recurring
 * `406 Not Acceptable` error caused by a missing `public.users` profile.
 */
export async function ensureUserProfile(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown> | null;
}): Promise<UserProfile | null> {
  // 1. Idempotency: return the existing profile if present.
  const existing = await fetchUserProfile(authUser.id);
  if (existing) return existing;

  const meta = (authUser.user_metadata || {}) as Record<string, any>;
  const email = authUser.email || (meta.email as string) || '';
  const name =
    (meta.name as string) ||
    (meta.full_name as string) ||
    (email ? email.split('@')[0] : 'User');

  // 2. Resolve the company. Invited users have companyId in metadata;
  //    self-registered users need a brand-new company.
  let companyId = meta.companyId as string | undefined;

  if (!companyId) {
    const companyName = (meta.companyName as string) || `${name}'s Company`;
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        legalName: companyName,
        email,
      })
      .select('id')
      .maybeSingle();

    if (companyError || !company) {
      console.error(
        '[ensureUserProfile] Failed to create company:',
        companyError?.message,
        companyError
      );
      return null;
    }
    companyId = company.id;
  }

  // 3. Upsert the profile (handles race conditions without duplicates).
  const { data: profile, error: insertError } = await supabase
    .from('users')
    .upsert(
      {
        id: authUser.id,
        companyId,
        name,
        email,
        role: 'ADMIN',
        status: 'ACTIVE',
        permissions: DEFAULT_ADMIN_PERMISSIONS,
      },
      { onConflict: 'id' }
    )
    .select('*, companies!users_companyId_fkey(*)')
    .maybeSingle();

  if (insertError) {
    console.error(
      '[ensureUserProfile] Failed to create user profile:',
      insertError.message,
      insertError
    );
    return null;
  }

  return (profile as UserProfile) ?? null;
}

// Helper to get the current user's company ID
export async function getCompanyId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getCompanyIdForUser(user.id);
}

// Helper to get a specific user's company ID
export async function getCompanyIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('companyId')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[getCompanyIdForUser] Error:', error.message);
    return null;
  }
  return data?.companyId || null;
}

// Helper to check if the current user is an admin
export async function isAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[isAdmin] Error:', error.message);
    return false;
  }
  // The DB enum stores the value in uppercase ('ADMIN').
  return data?.role === 'ADMIN';
}

// Export types for convenience
export type { Session, User, AuthError } from '@supabase/supabase-js';
