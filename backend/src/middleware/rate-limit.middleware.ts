import rateLimit from 'express-rate-limit';
import config from '../config';
import { ErrorCodes } from '../utils/error';

export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests, please try again later.',
    },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Too many authentication attempts, please try again later.',
    },
  },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Too many login attempts, please try again later.',
    },
  },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Too many password reset requests, please try again later.',
    },
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'API rate limit exceeded, please slow down.',
    },
  },
});

export const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Too many export requests, please try again later.',
    },
  },
});
