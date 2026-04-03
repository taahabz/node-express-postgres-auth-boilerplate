import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  generateRefreshTokenId,
  generateSecureToken,
  getRefreshTokenExpiry,
  getPasswordResetExpiry,
  getTokenExpiryDate,
  verifyRefreshToken 
} from '../config/jwt.js';
import { prisma } from '../prisma.js';
import { AppError } from '../types/index.js';
import { 
  SignupInput, 
  LoginInput, 
  RefreshTokenInput,
  RequestEmailOtpInput,
  VerifyEmailOtpInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  ChangePasswordInput
} from '../validators/auth.validator.js';
import {
  DEFAULT_ROLE,
  PERMISSION_DEFINITIONS,
  ROLE_DEFINITIONS,
  ROLE_PERMISSION_MAP,
} from '../config/rbac.js';
import { sendEmail } from '../config/email.js';
import { env } from '../config/env.js';

// Security constants
const MAX_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_DURATION_MINUTES = 30;
const BCRYPT_ROUNDS = 12; // Enterprise-grade bcrypt rounds
const EMAIL_OTP_TTL_MINUTES = 10;
const EMAIL_OTP_MAX_ATTEMPTS = 5;
const EMAIL_OTP_RESEND_COOLDOWN_SECONDS = 60;

let rbacBootstrapPromise: Promise<void> | null = null;

const ensureRbacInitialized = async (): Promise<void> => {
  if (!rbacBootstrapPromise) {
    rbacBootstrapPromise = prisma.$transaction(async (tx) => {
      await Promise.all(
        ROLE_DEFINITIONS.map((role) =>
          tx.role.upsert({
            where: { name: role.name },
            create: {
              name: role.name,
              description: role.description,
              isSystem: true,
            },
            update: {
              description: role.description,
              isSystem: true,
            },
          })
        )
      );

      await Promise.all(
        PERMISSION_DEFINITIONS.map((permission) =>
          tx.permission.upsert({
            where: { key: permission.key },
            create: {
              key: permission.key,
              description: permission.description,
            },
            update: {
              description: permission.description,
            },
          })
        )
      );

      const roles = await tx.role.findMany({
        select: { id: true, name: true },
      });

      const permissions = await tx.permission.findMany({
        select: { id: true, key: true },
      });

      const roleIdByName = new Map(roles.map((role) => [role.name, role.id]));
      const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

      for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSION_MAP)) {
        const roleId = roleIdByName.get(roleName);
        if (!roleId) continue;

        for (const permissionKey of permissionKeys) {
          const permissionId = permissionIdByKey.get(permissionKey);
          if (!permissionId) continue;

          await tx.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId,
                permissionId,
              },
            },
            create: {
              roleId,
              permissionId,
            },
            update: {},
          });
        }
      }
    });
  }

  await rbacBootstrapPromise;
};

export class AuthService {
  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private generateOtp(): string {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private async blacklistToken(token: string, fallbackExpiry: Date): Promise<void> {
    const expiresAt = getTokenExpiryDate(token) ?? fallbackExpiry;

    await prisma.tokenBlacklist.upsert({
      where: { token },
      create: {
        token,
        expiresAt,
      },
      update: {
        expiresAt,
      },
    });
  }

  private async sendVerificationEmail(email: string, otp: string): Promise<void> {
    const verifyUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/verify-email?email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: 'Your email verification OTP',
      text: `Your verification OTP is ${otp}. It expires in ${EMAIL_OTP_TTL_MINUTES} minutes.`,
      html: `<p>Your verification OTP is <strong>${otp}</strong>.</p><p>It expires in ${EMAIL_OTP_TTL_MINUTES} minutes.</p><p>Optional verify page: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
  }

  private async issueEmailVerificationOtp(userId: string, email: string): Promise<void> {
    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyOtpHash: otpHash,
        emailVerifyOtpExpiry: new Date(Date.now() + EMAIL_OTP_TTL_MINUTES * 60 * 1000),
        emailVerifyOtpAttempts: 0,
        emailVerifyOtpLastSentAt: new Date(),
      },
    });

    await this.sendVerificationEmail(email, otp);
  }

  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: email,
      subject: 'Password reset request',
      text: `Reset your password using this link: ${resetUrl}`,
      html: `<p>Reset your password by clicking <a href="${resetUrl}">this link</a>.</p>`,
    });
  }

  // Helper: Check if account is locked
  private async isAccountLocked(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true },
    });

    if (!user?.lockedUntil) return false;

    if (user.lockedUntil > new Date()) {
      return true; // Still locked
    }

    // Lock expired, reset
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: null, failedLoginAttempts: 0 },
    });

    return false;
  }

  // Helper: Handle failed login attempt
  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true },
    });

    const attempts = (user?.failedLoginAttempts || 0) + 1;

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MINUTES * 60 * 1000);
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: lockUntil,
        },
      });
      throw new AppError(
        429,
        `Account locked due to too many failed login attempts. Try again in ${ACCOUNT_LOCK_DURATION_MINUTES} minutes.`
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts },
    });
  }

  // Helper: Reset failed login attempts
  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
  }

  // Helper: Clean up expired refresh tokens
  private async cleanupExpiredTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true },
        ],
      },
    });
  }

  async signup(input: SignupInput) {
    await ensureRbacInitialized();

    const { email, password } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(400, 'User with this email already exists');
    }

    // Hash password with enterprise-grade rounds
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        userRoles: {
          create: {
            role: {
              connect: {
                name: DEFAULT_ROLE,
              },
            },
          },
        },
      },
      include: {
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    await this.issueEmailVerificationOtp(user.id, user.email);

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);
    const refreshTokenId = generateRefreshTokenId();

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return { 
      user: { 
        id: user.id, 
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        roles: user.userRoles.map((userRole) => userRole.role.name),
      },
      accessToken,
      refreshToken,
      message: 'Account created successfully. Please verify your email.'
    };
  }

  async login(input: LoginInput) {
    const { email, password } = input;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Check if account is locked
    if (await this.isAccountLocked(user.id)) {
      throw new AppError(429, `Account is locked due to too many failed login attempts. Try again in ${ACCOUNT_LOCK_DURATION_MINUTES} minutes.`);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await this.handleFailedLogin(user.id);
      throw new AppError(401, 'Invalid email or password');
    }

    // Reset failed login attempts
    await this.resetFailedLoginAttempts(user.id);

    // Clean up expired tokens
    await this.cleanupExpiredTokens(user.id);

    // Generate new tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);
    const refreshTokenId = generateRefreshTokenId();

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return { 
      user: { 
        id: user.id, 
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      },
      accessToken,
      refreshToken
    };
  }

  async refreshAccessToken(input: RefreshTokenInput) {
    const { refreshToken } = input;

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new AppError(401, 'Invalid token type');
      }
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    // Check if refresh token exists in database and is not revoked
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.userId, decoded.email);

    // Optional: Rotate refresh token for extra security
    const newRefreshToken = generateRefreshToken(decoded.userId, decoded.email);
    const newRefreshTokenId = generateRefreshTokenId();

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      }),
      prisma.refreshToken.create({
        data: {
          id: newRefreshTokenId,
          token: newRefreshToken,
          userId: decoded.userId,
          expiresAt: getRefreshTokenExpiry(),
        },
      }),
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async requestEmailVerificationOtp(input: RequestEmailOtpInput) {
    const { email } = input;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        emailVerifyOtpLastSentAt: true,
      },
    });

    if (!user) {
      return { message: 'If an account exists, an OTP has been sent to the email address.' };
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    if (
      user.emailVerifyOtpLastSentAt &&
      user.emailVerifyOtpLastSentAt.getTime() + EMAIL_OTP_RESEND_COOLDOWN_SECONDS * 1000 > Date.now()
    ) {
      throw new AppError(429, 'Please wait before requesting another OTP');
    }

    await this.issueEmailVerificationOtp(user.id, user.email);

    return { message: 'If an account exists, an OTP has been sent to the email address.' };
  }

  async verifyEmailOtp(input: VerifyEmailOtpInput) {
    const { email, otp } = input;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isEmailVerified: true,
        emailVerifyOtpHash: true,
        emailVerifyOtpExpiry: true,
        emailVerifyOtpAttempts: true,
      },
    });

    if (!user) {
      throw new AppError(400, 'Invalid email or OTP');
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    if (!user.emailVerifyOtpHash || !user.emailVerifyOtpExpiry || user.emailVerifyOtpExpiry < new Date()) {
      throw new AppError(400, 'OTP expired or not requested');
    }

    const expectedHash = user.emailVerifyOtpHash;
    const providedHash = this.hashOtp(otp);

    if (expectedHash !== providedHash) {
      const attempts = user.emailVerifyOtpAttempts + 1;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifyOtpAttempts: attempts,
          ...(attempts >= EMAIL_OTP_MAX_ATTEMPTS
            ? {
                emailVerifyOtpHash: null,
                emailVerifyOtpExpiry: null,
                emailVerifyOtpAttempts: 0,
              }
            : {}),
        },
      });

      throw new AppError(400, 'Invalid OTP');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyOtpHash: null,
        emailVerifyOtpExpiry: null,
        emailVerifyOtpAttempts: 0,
        emailVerifyOtpLastSentAt: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async logout(userId: string, tokens?: { refreshToken?: string; accessToken?: string }) {
    if (tokens?.refreshToken) {
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          token: tokens.refreshToken,
        },
        data: { isRevoked: true },
      });
    } else {
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }

    if (tokens?.accessToken) {
      const fallbackExpiry = new Date(Date.now() + 15 * 60 * 1000);
      await this.blacklistToken(tokens.accessToken, fallbackExpiry);
    }

    return { message: 'Logged out successfully' };
  }

  async requestPasswordReset(input: RequestPasswordResetInput) {
    const { email } = input;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists
    if (!user) {
      return { message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = generateSecureToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: getPasswordResetExpiry(),
      },
    });

    await this.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If an account exists with this email, a password reset link has been sent.' };
  }

  async resetPassword(input: ResetPasswordInput) {
    const { token, password } = input;

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      throw new AppError(400, 'Invalid or expired password reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        // Revoke all sessions for security
        refreshTokens: {
          updateMany: {
            where: { userId: user.id },
            data: { isRevoked: true },
          },
        },
      },
    });

    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const { currentPassword, newPassword } = input;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new AppError(400, 'New password must be different from current password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password and revoke all sessions
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        refreshTokens: {
          updateMany: {
            where: { userId },
            data: { isRevoked: true },
          },
        },
      },
    });

    return { message: 'Password changed successfully. Please login again.' };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
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
      throw new AppError(404, 'User not found');
    }

    return {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.userRoles.map((userRole) => userRole.role.name),
      permissions: Array.from(
        new Set(
          user.userRoles.flatMap((userRole) =>
            userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.key)
          )
        )
      ),
    };
  }
}

export const authService = new AuthService();
