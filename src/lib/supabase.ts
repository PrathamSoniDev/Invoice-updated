/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';

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

export async function ensureUserProfile(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown> | null;
}): Promise<UserProfile | null> {

  const existing = await fetchUserProfile(authUser.id);
  
  if (existing) return existing;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.error('[ensureUserProfile] No active session; cannot provision profile');
    return null;
  }

  const { data, error } = await supabase.functions.invoke('ensure-user-profile', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    console.error('[ensureUserProfile] ensure-user-profile function failed:', error.message, error);
    return null;
  }

  return (data?.profile as UserProfile) ?? null;
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