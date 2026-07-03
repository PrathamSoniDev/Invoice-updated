/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

// Pagination types
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Helper to get paginated results
export async function paginate<T>(
  query: any,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResult<T>> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

// Helper to handle Supabase errors
export function handleSupabaseError(error: { message?: string }): never {
  console.error('Supabase error:', error);
  throw new Error(error.message || 'An unexpected error occurred');
}

// Get current user ID
export async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// Get current user's company ID
export async function getCurrentCompanyId(): Promise<string> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('users')
    .select('companyId')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('User not found');
  return data.companyId;
}

// Transform database column names (camelCase) to frontend format
export function transformRow(row: Record<string, unknown>): Record<string, unknown> {
  return row;
}

// Build search query for text fields
export function buildSearchQuery(query: any, searchTerm: string, fields: string[]) {
  if (!searchTerm) return query;

  const searchConditions = fields.map(field => `${field}.ilike.%${searchTerm}%`);
  return query.or(searchConditions.join(','));
}

// Format date for queries
export function formatDateForQuery(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString();
}

// Soft delete helper
export async function softDelete(table: string, id: string): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({ deletedAt: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// Restore soft deleted record
export async function restore(table: string, id: string): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({ deletedAt: null })
    .eq('id', id);

  if (error) throw error;
}

// Activity logger
export async function logActivity(
  action: string,
  entityType: string,
  entityId: string,
  description: string,
   
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const companyId = await getCurrentCompanyId();

    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .maybeSingle();

    await supabase.from('activity_logs').insert({
      companyId,
      userId,
      userName: userData?.name || 'Unknown',
      action,
      entityType,
      entityId,
      description,
      metadata,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Audit logger
export async function logAudit(
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'settings' | 'view',
  module: string,
  entityId: string,
  entityName: string,
  description: string,
   
  oldValues?: Record<string, any>,
   
  newValues?: Record<string, any>
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const companyId = await getCurrentCompanyId();

    const { data: userData } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', userId)
      .maybeSingle();

    await supabase.from('audit_logs').insert({
      companyId,
      userId,
      userName: userData?.name || 'Unknown',
      userRole: userData?.role || 'STAFF',
      action,
      module,
      entityType: module,
      entityId,
      entityName,
      description,
      oldValues,
      newValues,
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}
