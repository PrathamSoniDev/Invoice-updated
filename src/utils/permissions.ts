import type { ModuleKey, UserRole } from '@/types';

export const MODULE_KEYS: ModuleKey[] = [
  'dashboard',
  'customers',
  'invoices',
  'payment-links',
  'whatsapp',
  'email',
  'reports',
  'settings',
  'admin',
];

export const DEFAULT_ADMIN_PERMISSIONS: ModuleKey[] = [...MODULE_KEYS];

const MODULE_KEY_ALIASES: Record<string, ModuleKey> = {
  dashboard: 'dashboard',
  customers: 'customers',
  invoices: 'invoices',
  paymentlinks: 'payment-links',
  payment_links: 'payment-links',
  'payment-links': 'payment-links',
  whatsapp: 'whatsapp',
  email: 'email',
  reports: 'reports',
  settings: 'settings',
  admin: 'admin',
};

const USER_ROLE_ALIASES: Record<string, UserRole> = {
  admin: 'admin',
  business: 'business',
  manager: 'manager',
  staff: 'staff',
  viewer: 'viewer',
};

function normalizeToken(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeModuleKey(value: unknown): ModuleKey | null {
  const token = normalizeToken(value);
  if (!token) return null;

  return MODULE_KEY_ALIASES[token] ?? MODULE_KEY_ALIASES[token.replace(/[_\s]/g, '-')]
    ?? MODULE_KEY_ALIASES[token.replace(/[-\s]/g, '_')]
    ?? null;
}

export function toDbModuleKey(value: unknown): string {
  const normalized = normalizeModuleKey(value);
  if (!normalized) throw new Error(`Unknown module key: ${String(value)}`);
  return normalized.replace(/-/g, '_').toUpperCase();
}

export function normalizePermissions(permissions: unknown): ModuleKey[] {
  if (!Array.isArray(permissions)) return [];

  return Array.from(
    new Set(
      permissions
        .map(normalizeModuleKey)
        .filter((key): key is ModuleKey => key !== null)
    )
  );
}

export function normalizeUserRole(value: unknown): UserRole | null {
  const token = normalizeToken(value);
  return USER_ROLE_ALIASES[token] ?? null;
}

export function normalizeRoles(roles: unknown): UserRole[] {
  if (!Array.isArray(roles)) return [];

  return Array.from(
    new Set(
      roles
        .map((role) => normalizeUserRole(typeof role === 'object' && role !== null && 'role' in role ? (role as { role: unknown }).role : role))
        .filter((role): role is UserRole => role !== null)
    )
  );
}
