import { NextFunction, Response } from 'express';
import { AuthenticatedRequest, AppError } from '../types/index.js';

interface AuthorizeOptions {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
}

export const authorize = ({ roles = [], permissions = [], requireAll = false }: AuthorizeOptions) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError(401, 'User not authenticated');
      }

      const userRoles = req.user.roles || [];
      const userPermissions = req.user.permissions || [];

      const roleMatch =
        roles.length === 0
          ? true
          : requireAll
            ? roles.every((role) => userRoles.includes(role))
            : roles.some((role) => userRoles.includes(role));

      const permissionMatch =
        permissions.length === 0
          ? true
          : requireAll
            ? permissions.every((permission) => userPermissions.includes(permission))
            : permissions.some((permission) => userPermissions.includes(permission));

      if (!roleMatch || !permissionMatch) {
        throw new AppError(403, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireRoles = (...roles: string[]) => authorize({ roles });

export const requirePermissions = (...permissions: string[]) => authorize({ permissions });
