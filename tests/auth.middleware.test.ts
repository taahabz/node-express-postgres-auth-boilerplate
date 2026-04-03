import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticate } from '../src/middleware/auth.middleware.js';
import { AppError } from '../src/types/index.js';

const prismaMock = vi.hoisted(() => ({
  tokenBlacklist: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock('../src/prisma.js', () => ({
  prisma: prismaMock,
}));

const verifyAccessTokenMock = vi.hoisted(() => vi.fn());

vi.mock('../src/config/jwt.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches user context for a valid token', async () => {
    verifyAccessTokenMock.mockReturnValue({
      userId: 'u1',
      email: 'user@example.com',
      type: 'access',
    });

    prismaMock.tokenBlacklist.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      lockedUntil: null,
      isEmailVerified: true,
      userRoles: [
        {
          role: {
            name: 'USER',
            rolePermissions: [
              { permission: { key: 'profile:read' } },
              { permission: { key: 'auth:change-password' } },
            ],
          },
        },
      ],
    });

    const req = {
      headers: { authorization: 'Bearer valid-access-token' },
      user: undefined,
    } as any;
    const res = {} as any;
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: 'u1',
      email: 'user@example.com',
      roles: ['USER'],
      permissions: ['profile:read', 'auth:change-password'],
    });
  });

  it('rejects blacklisted tokens', async () => {
    verifyAccessTokenMock.mockReturnValue({
      userId: 'u1',
      email: 'user@example.com',
      type: 'access',
    });

    prismaMock.tokenBlacklist.findUnique.mockResolvedValue({ token: 'revoked-token' });

    const req = {
      headers: { authorization: 'Bearer revoked-token' },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(401);
  });

  it('rejects locked accounts', async () => {
    verifyAccessTokenMock.mockReturnValue({
      userId: 'u1',
      email: 'user@example.com',
      type: 'access',
    });

    prismaMock.tokenBlacklist.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      lockedUntil: new Date(Date.now() + 60_000),
      isEmailVerified: true,
      userRoles: [],
    });

    const req = {
      headers: { authorization: 'Bearer valid-access-token' },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(403);
  });
});
