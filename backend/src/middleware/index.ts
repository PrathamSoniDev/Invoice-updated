import { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import config from '../config';

export { authMiddleware, optionalAuthMiddleware } from './auth.middleware';
export { requireRole, requireAdmin, requireMinRole, requirePermission, requireAnyPermission } from './rbac.middleware';
export { requireModuleAccess, requireAnyModuleAccess, requireModuleActions } from './module.middleware';
export { validateBody, validateQuery, validateParams, validateRequest } from './validation.middleware';
export {
  generalRateLimiter,
  authRateLimiter,
  loginRateLimiter,
  passwordResetRateLimiter,
  apiRateLimiter,
  exportRateLimiter,
} from './rate-limit.middleware';
export { errorHandler, notFoundHandler } from './error.middleware';

export const setupCorsMiddleware = () => {
  return cors({
    origin: config.cors.origins,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Company-Id'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400,
  });
};

export const setupHelmetMiddleware = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  });
};

export const setupCompressionMiddleware = () => {
  return compression({
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024,
  });
};
