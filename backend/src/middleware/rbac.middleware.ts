import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../utils/error';
import { USER_ROLES, ROLE_HIERARCHY } from '../constants';

type UserRole = keyof typeof USER_ROLES;

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    const userRole = req.user.role as UserRole;

    if (!roles.includes(userRole)) {
      // Check hierarchy - if user has higher role, they can access
      const userLevel = ROLE_HIERARCHY[userRole] || 0;
      const minRequiredLevel = Math.min(...roles.map(r => ROLE_HIERARCHY[r] || 0));

      if (userLevel < minRequiredLevel) {
        throw new AppError('Insufficient permissions', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
      }
    }

    next();
  };
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
  }

  if (req.user.role !== 'ADMIN') {
    throw new AppError('Admin access required', 403, ErrorCodes.FORBIDDEN);
  }

  next();
}

export function requireMinRole(minRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    const userLevel = ROLE_HIERARCHY[req.user.role as UserRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      throw new AppError('Insufficient permissions', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    const permissions = req.user.permissions || [];

    if (!permissions.includes(permission)) {
      throw new AppError(
        `Permission '${permission}' required`,
        403,
        ErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }

    next();
  };
}

export function requireAnyPermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      throw new AppError(
        'Insufficient permissions',
        403,
        ErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }

    next();
  };
}
