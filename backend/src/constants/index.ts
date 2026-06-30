export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  BUSINESS: 'BUSINESS',
  VIEWER: 'VIEWER',
} as const;

export const USER_STATUSES = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  INVITED: 'INVITED',
  INACTIVE: 'INACTIVE',
} as const;

export const INVOICE_STATUSES = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  VIEWED: 'VIEWED',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;

export const PAYMENT_LINK_STATUSES = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
} as const;

export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export const MODULES = {
  DASHBOARD: 'DASHBOARD',
  CUSTOMERS: 'CUSTOMERS',
  INVOICES: 'INVOICES',
  PAYMENT_LINKS: 'PAYMENT_LINKS',
  WHATSAPP: 'WHATSAPP',
  EMAIL: 'EMAIL',
  REPORTS: 'REPORTS',
  SETTINGS: 'SETTINGS',
  ADMIN: 'ADMIN',
} as const;

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT: 'EXPORT',
  SETTINGS: 'SETTINGS',
  VIEW: 'VIEW',
} as const;

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<string, number> = {
  ADMIN: 100,
  MANAGER: 75,
  STAFF: 50,
  BUSINESS: 25,
  VIEWER: 10,
};

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 300,       // 5 minutes
  MEDIUM: 900,      // 15 minutes
  LONG: 3600,       // 1 hour
  VERY_LONG: 86400, // 24 hours
  SESSION: 900,     // 15 minutes
  REFRESH_TOKEN: 604800, // 7 days
  REFRESH_TOKEN_REMEMBER: 2592000, // 30 days
} as const;

// Rate limit configurations
export const RATE_LIMITS = {
  GLOBAL: {
    windowMs: 60 * 1000,
    max: 100,
  },
  AUTH: {
    windowMs: 15 * 60 * 1000,
    max: 5,
  },
  API: {
    windowMs: 60 * 1000,
    max: 60,
  },
} as const;

// HTTP Status messages
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;
