import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';
import { AppError, ErrorCodes } from './error';

export interface AccessTokenPayload {
  userId: string;
  id: string;
  email: string;
  role: string;
  companyId: string;
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: '15m',
    algorithm: 'HS256',
  };
  return jwt.sign(payload, config.jwt.secret, options);
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function generateTokenPair(payload: AccessTokenPayload, rememberMe: boolean = false): TokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken();

  return {
    accessToken,
    refreshToken,
    expiresIn: 900,
  };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS256'],
    }) as AccessTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token expired', 401, ErrorCodes.TOKEN_EXPIRED);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401, ErrorCodes.TOKEN_INVALID);
    }
    throw new AppError('Token verification failed', 401, ErrorCodes.TOKEN_INVALID);
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getTokenExpiry(rememberMe: boolean = false): Date {
  const ms = rememberMe
    ? parseTimeToMs(config.jwt.refreshRememberMeExpiresIn)
    : parseTimeToMs(config.jwt.refreshExpiresIn);
  return new Date(Date.now() + ms);
}

function parseTimeToMs(timeStr: string): number {
  const unit = timeStr.slice(-1);
  const value = parseInt(timeStr.slice(0, -1), 10);

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 1000;
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
