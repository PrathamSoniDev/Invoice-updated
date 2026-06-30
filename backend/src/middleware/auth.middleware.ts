import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractBearerToken, AccessTokenPayload } from '../utils/jwt';
import { AppError, ErrorCodes } from '../utils/error';
import { userRepository } from '../repositories/user.repository';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      companyId?: string;
      userId?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw new AppError('No authentication token provided', 401, ErrorCodes.UNAUTHORIZED);
    }

    const payload = verifyAccessToken(token);

    // Check if session is still valid
    const user = await userRepository.findByIdWithPermissions(payload.userId);
    if (!user) {
      throw new AppError('User not found', 401, ErrorCodes.UNAUTHORIZED);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is not active', 403, ErrorCodes.ACCOUNT_SUSPENDED);
    }

    // Update last active
    await userRepository.updateLastActive(payload.userId).catch(() => {});

    req.user = payload;
    req.companyId = payload.companyId;
    req.userId = payload.userId;

    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    req.companyId = payload.companyId;
    req.userId = payload.userId;
    next();
  } catch {
    next();
  }
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }

  if (req.user.role !== 'ADMIN') {
    throw new AppError('Admin access required', 403, ErrorCodes.FORBIDDEN);
  }

  next();
}
