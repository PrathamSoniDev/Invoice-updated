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

// PostgREST's `.or()` filter string uses commas to separate conditions and
// parentheses for logical grouping. A raw search term containing either
// would silently corrupt the filter (dropped/misparsed conditions) rather
// than throwing, so we strip them before they ever reach `.or(...)`.
export function sanitizeSearchTerm(searchTerm: string | undefined | null): string {
  if (!searchTerm) return '';
  return searchTerm.trim().replace(/[,()]/g, '');
}

// Cross-table search helper: several list views (invoices, payment links)
// join `customers` for display but PostgREST's embedded-resource filters
// don't reliably narrow the parent rows. Instead, resolve which customers
// match the search term first, then fold those ids into the parent query's
// own `.or()` filter via `customerId.in.(...)`. This is what lets "search
// every parameter" reach fields that live on the joined customer row (name,
// business name, email, mobile, GSTIN, city, etc.) as well as the parent's
// own columns.
export async function findMatchingCustomerIds(companyId: string, searchTerm: string): Promise<string[]> {
  if (!searchTerm) return [];

  const { data, error } = await supabase
    .from('customers')
    .select('id')
    .eq('companyId', companyId)
    .is('deletedAt', null)
    .or(
      [
        `name.ilike.%${searchTerm}%`,
        `businessName.ilike.%${searchTerm}%`,
        `email.ilike.%${searchTerm}%`,
        `mobile.ilike.%${searchTerm}%`,
        `whatsapp.ilike.%${searchTerm}%`,
        `gstNumber.ilike.%${searchTerm}%`,
        `billingCity.ilike.%${searchTerm}%`,
        `billingState.ilike.%${searchTerm}%`,
        `billingPincode.ilike.%${searchTerm}%`,
      ].join(','),
    )
    .limit(200);

  if (error) throw error;
  return (data || []).map((row: { id: string }) => row.id);
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
//
// The `audit_logs` table schema (see migration 20260701110623) is:
//   id(uuid), "companyId"(uuid NOT NULL), "userId"(uuid), action("AuditAction" NOT NULL),
//   "entityType"(text NOT NULL), "entityId"(text), "oldValues"(jsonb),
//   "newValues"(jsonb), "ipAddress"(text), "userAgent"(text), "createdAt"(timestamptz)
//
// The "AuditAction" enum is UPPERCASE: CREATE, UPDATE, DELETE, LOGIN, LOGOUT,
// EXPORT, SETTINGS, VIEW. Callers pass lowercase values, so we uppercase here.
//
// IMPORTANT: audit logging is non-critical. A failure here MUST NOT prevent the
// calling operation (e.g. user creation) from completing. The entire body is
// wrapped in try/catch and errors are logged but never re-thrown.
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

    // Build the payload with ONLY columns that exist in the audit_logs table.
    // Previously this sent 5 extra fields (userName, userRole, module,
    // entityName, description) which caused PostgREST to return 400 Bad
    // Request ("Could not find the '...' column"). The description/entityName
    // are preserved inside newValues so the information is not lost.
    const payload = {
      companyId,
      userId,
      action: action.toUpperCase(), // AuditAction enum is uppercase
      entityType: module,           // text NOT NULL
      entityId,
      oldValues: oldValues ?? null,
      newValues: { ...newValues, entityName, description },
    };

    // Log the exact payload before the insert for debugging.
    console.debug('[logAudit] inserting audit_logs payload:', JSON.stringify(payload));

    const { error } = await supabase.from('audit_logs').insert(payload);

    if (error) {
      // Print the complete Supabase error object so the root cause is visible.
      console.error('[logAudit] insert failed — full error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
  } catch (error) {
    // Non-critical: log and continue. Never re-throw.
    console.error('[logAudit] unexpected failure (non-blocking):', error);
  }
}
