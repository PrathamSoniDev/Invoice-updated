// Custom Error Classes
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>[];

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, unknown>[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    if (details) {
      this.details = details;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>[]) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR', false);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(message || `${service} service error`, 502, 'EXTERNAL_SERVICE_ERROR', false);
  }
}

export enum ErrorCodes {
  // Auth errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID',
  PASSWORD_RESET_INVALID = 'PASSWORD_RESET_INVALID',
  PASSWORD_RESET_EXPIRED = 'PASSWORD_RESET_EXPIRED',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_GST = 'INVALID_GST',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  INVOICE_NOT_FOUND = 'INVOICE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  COMPANY_NOT_FOUND = 'COMPANY_NOT_FOUND',

  // Conflict errors
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  DUPLICATE_GST = 'DUPLICATE_GST',
  DUPLICATE_INVOICE_NUMBER = 'DUPLICATE_INVOICE_NUMBER',
  INVOICE_HAS_PAYMENTS = 'INVOICE_HAS_PAYMENTS',
  CUSTOMER_HAS_INVOICES = 'CUSTOMER_HAS_INVOICES',

  // Permission errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  MODULE_DISABLED = 'MODULE_DISABLED',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Rate limit errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_LOGIN_ATTEMPTS = 'TOO_MANY_LOGIN_ATTEMPTS',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  EMAIL_SEND_ERROR = 'EMAIL_SEND_ERROR',
}
