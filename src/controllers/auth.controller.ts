import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { 
  SignupInput, 
  LoginInput, 
  RefreshTokenInput,
  RequestEmailOtpInput,
  VerifyEmailOtpInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  ChangePasswordInput,
  LogoutInput,
} from '../validators/auth.validator.js';
import { AuthenticatedRequest } from '../types/index.js';

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as SignupInput;
      const result = await authService.signup(input);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as LoginInput;
      const result = await authService.login(input);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as RefreshTokenInput;
      const result = await authService.refreshAccessToken(input);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async requestEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as RequestEmailOtpInput;
      const result = await authService.requestEmailVerificationOtp(input);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as VerifyEmailOtpInput;
      const result = await authService.verifyEmailOtp(input);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { refreshToken } = req.body as LogoutInput;
      const accessToken = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : undefined;

      const result = await authService.logout(req.user.id, {
        refreshToken,
        accessToken,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as RequestPasswordResetInput;
      const result = await authService.requestPasswordReset(input);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as ResetPasswordInput;
      const result = await authService.resetPassword(input);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const input = req.body as ChangePasswordInput;
      const result = await authService.changePassword(req.user.id, input);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const profile = await authService.getProfile(req.user.id);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
