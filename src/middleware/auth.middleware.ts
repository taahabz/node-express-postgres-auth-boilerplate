import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AppError } from '../types/index.js';
import { prisma } from '../prisma.js';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Authorization token required');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyAccessToken(token);
      
      if (decoded.type !== 'access') {
        throw new AppError(401, 'Invalid token type');
      }

      // Check if token is blacklisted
      const isBlacklisted = await prisma.tokenBlacklist.findUnique({
        where: { token },
      });

      if (isBlacklisted) {
        throw new AppError(401, 'Token has been revoked');
      }

      // Verify user still exists and is not locked
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { 
          id: true, 
          email: true, 
          lockedUntil: true,
          isEmailVerified: true,
          userRoles: {
            select: {
              role: {
                select: {
                  name: true,
                  rolePermissions: {
                    select: {
                      permission: {
                        select: {
                          key: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new AppError(401, 'User not found');
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new AppError(403, 'Account is locked');
      }

      const roles = user.userRoles.map((userRole) => userRole.role.name);
      const permissions = Array.from(
        new Set(
          user.userRoles.flatMap((userRole) =>
            userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.key)
          )
        )
      );

      req.user = {
        id: user.id,
        email: user.email,
        roles,
        permissions,
      };
      next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(401, 'Invalid or expired token');
    }
  } catch (error) {
    next(error);
  }
};
