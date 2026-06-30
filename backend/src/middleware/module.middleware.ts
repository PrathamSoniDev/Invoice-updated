import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../utils/error';
import { MODULES } from '../constants';

type ModuleKey = keyof typeof MODULES;
type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'export' | 'configure';

export function requireModuleAccess(moduleKey: ModuleKey, action: PermissionAction = 'read') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    const userPermissions = req.user.permissions || [];
    const modulePermission = `${moduleKey}:${action}`;

    if (!userPermissions.includes(modulePermission)) {
      const allActionPermission = `${moduleKey}:all`;
      if (!userPermissions.includes(allActionPermission)) {
        throw new AppError(
          `Access denied. '${moduleKey}:${action}' permission required.`,
          403,
          ErrorCodes.INSUFFICIENT_PERMISSIONS
        );
      }
    }

    next();
  };
}

export function requireAnyModuleAccess(
  moduleKeys: ModuleKey[],
  action: PermissionAction = 'read'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    const userPermissions = req.user.permissions || [];
    const hasAnyAccess = moduleKeys.some(moduleKey => {
      const modulePermission = `${moduleKey}:${action}`;
      const allActionPermission = `${moduleKey}:all`;
      return userPermissions.includes(modulePermission) || userPermissions.includes(allActionPermission);
    });

    if (!hasAnyAccess) {
      throw new AppError(
        'Access denied. Insufficient module permissions.',
        403,
        ErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }

    next();
  };
}

export function requireModuleActions(moduleKey: ModuleKey, actions: PermissionAction[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    const userPermissions = req.user.permissions || [];
    const hasAllActions = actions.every(action => {
      const modulePermission = `${moduleKey}:${action}`;
      const allActionPermission = `${moduleKey}:all`;
      return userPermissions.includes(modulePermission) || userPermissions.includes(allActionPermission);
    });

    if (!hasAllActions) {
      throw new AppError(
        `Access denied. Required permissions: ${actions.map(a => `${moduleKey}:${a}`).join(', ')}`,
        403,
        ErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }

    next();
  };
}
