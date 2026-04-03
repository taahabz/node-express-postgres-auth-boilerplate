import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/services/auth.service.js';
import { generateRefreshToken } from '../src/config/jwt.js';

const sendEmailMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => {
  const mock = {
    $transaction: vi.fn(),
    role: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    permission: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    rolePermission: {
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    tokenBlacklist: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };

  mock.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(mock));

  return mock;
});

vi.mock('../src/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../src/config/email.js', () => ({
  sendEmail: sendEmailMock,
  isEmailEnabled: vi.fn(() => true),
}));

describe('AuthService', () => {
  const authService = new AuthService();

  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.role.findMany.mockResolvedValue([]);
    prismaMock.permission.findMany.mockResolvedValue([]);
  });

  it('locks account after repeated failed login attempts', async () => {
    const hashed = await bcrypt.hash('CorrectPass123!', 12);

    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'u1',
        email: 'user@example.com',
        password: hashed,
        failedLoginAttempts: 4,
      })
      .mockResolvedValueOnce({ lockedUntil: null })
      .mockResolvedValueOnce({ failedLoginAttempts: 4 });

    await expect(
      authService.login({
        email: 'user@example.com',
        password: 'WrongPassword123!',
      }),
    ).rejects.toMatchObject({
      statusCode: 429,
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      }),
    );
  });

  it('creates a user and sends an OTP verification email on signup', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'u1',
      email: 'new@example.com',
      isEmailVerified: false,
      createdAt: new Date('2026-04-04T00:00:00.000Z'),
      userRoles: [{ role: { name: 'USER' } }],
    });

    const result = await authService.signup({
      email: 'new@example.com',
      password: 'StrongPass123!',
    });

    expect(result.user.email).toBe('new@example.com');
    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('requests a password reset and sends a reset email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
    });

    const result = await authService.requestPasswordReset({
      email: 'user@example.com',
    });

    expect(result.message).toContain('password reset link has been sent');
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          passwordResetToken: expect.any(String),
          passwordResetExpiry: expect.any(Date),
        }),
      }),
    );
    expect(sendEmailMock).toHaveBeenCalled();
  });

  it('throttles OTP resend requests when cooldown has not elapsed', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      isEmailVerified: false,
      emailVerifyOtpLastSentAt: new Date(Date.now() - 30_000),
    });

    await expect(
      authService.requestEmailVerificationOtp({
        email: 'user@example.com',
      }),
    ).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it('increments OTP attempts and clears the OTP after max failures', async () => {
    const otpHash = crypto.createHash('sha256').update('123456').digest('hex');

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      isEmailVerified: false,
      emailVerifyOtpHash: otpHash,
      emailVerifyOtpExpiry: new Date(Date.now() + 5 * 60 * 1000),
      emailVerifyOtpAttempts: 4,
    });

    await expect(
      authService.verifyEmailOtp({
        email: 'user@example.com',
        otp: '000000',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          emailVerifyOtpHash: null,
          emailVerifyOtpExpiry: null,
          emailVerifyOtpAttempts: 0,
        }),
      }),
    );
  });

  it('changes password and revokes all sessions', async () => {
    const hashed = await bcrypt.hash('CorrectPass123!', 12);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      password: hashed,
    });

    const result = await authService.changePassword('u1', {
      currentPassword: 'CorrectPass123!',
      newPassword: 'NewStrongPass123!',
    });

    expect(result.message).toContain('Password changed successfully');
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          password: expect.any(String),
          refreshTokens: {
            updateMany: {
              where: { userId: 'u1' },
              data: { isRevoked: true },
            },
          },
        }),
      }),
    );
  });

  it('returns profile data with deduped permissions', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      isEmailVerified: true,
      lastLoginAt: new Date('2026-04-01T00:00:00.000Z'),
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-04T00:00:00.000Z'),
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
        {
          role: {
            name: 'MODERATOR',
            rolePermissions: [
              { permission: { key: 'profile:read' } },
              { permission: { key: 'users:read' } },
            ],
          },
        },
      ],
    });

    const profile = await authService.getProfile('u1');

    expect(profile.roles).toEqual(['USER', 'MODERATOR']);
    expect(profile.permissions).toEqual(['profile:read', 'auth:change-password', 'users:read']);
  });

  it('rotates refresh token and blacklists old one', async () => {
    const refreshToken = generateRefreshToken('u1', 'user@example.com');

    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      token: refreshToken,
      userId: 'u1',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86_400_000),
      user: { id: 'u1' },
    });

    prismaMock.tokenBlacklist.findUnique.mockResolvedValue(null);

    await authService.refreshAccessToken({ refreshToken });

    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { isRevoked: true },
    });

    expect(prismaMock.tokenBlacklist.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: refreshToken },
      }),
    );

    expect(prismaMock.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('blacklists both access and refresh tokens on logout', async () => {
    const refreshToken = generateRefreshToken('u1', 'user@example.com');

    await authService.logout('u1', {
      refreshToken,
      accessToken: 'access-token-value',
    });

    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { isRevoked: true },
    });

    expect(prismaMock.tokenBlacklist.upsert).toHaveBeenCalledTimes(2);
  });

  it('verifies email with OTP and clears OTP fields', async () => {
    const otp = '123456';
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      isEmailVerified: false,
      emailVerifyOtpHash: otpHash,
      emailVerifyOtpExpiry: new Date(Date.now() + 5 * 60 * 1000),
      emailVerifyOtpAttempts: 0,
    });

    const result = await authService.verifyEmailOtp({
      email: 'user@example.com',
      otp,
    });

    expect(result).toEqual({ message: 'Email verified successfully' });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        isEmailVerified: true,
        emailVerifyOtpHash: null,
        emailVerifyOtpExpiry: null,
        emailVerifyOtpAttempts: 0,
        emailVerifyOtpLastSentAt: null,
      },
    });
  });
});
