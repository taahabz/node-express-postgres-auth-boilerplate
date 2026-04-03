import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  authLimiter,
  emailOtpSendLimiter,
  emailOtpVerifyLimiter,
  logoutLimiter,
  passwordChangeLimiter,
  passwordResetLimiter,
  passwordResetRequestLimiter,
  refreshLimiter,
} from '../middleware/rateLimiter.middleware.js';
import { 
  signupSchema, 
  loginSchema, 
  refreshTokenSchema,
  requestEmailOtpSchema,
  verifyEmailOtpSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  logoutSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes with rate limiting
router.post('/signup', authLimiter, validate(signupSchema), authController.signup.bind(authController));
router.post('/login', authLimiter, validate(loginSchema), authController.login.bind(authController));
router.post('/refresh', refreshLimiter, validate(refreshTokenSchema), authController.refreshToken.bind(authController));
router.post('/verify-email/otp/request', emailOtpSendLimiter, validate(requestEmailOtpSchema), authController.requestEmailOtp.bind(authController));
router.post('/verify-email/otp/verify', emailOtpVerifyLimiter, validate(verifyEmailOtpSchema), authController.verifyEmailOtp.bind(authController));
router.post('/password/request-reset', passwordResetRequestLimiter, validate(requestPasswordResetSchema), authController.requestPasswordReset.bind(authController));
router.post('/password/reset', passwordResetLimiter, validate(resetPasswordSchema), authController.resetPassword.bind(authController));

// Protected routes
router.post('/logout', logoutLimiter, authenticate, validate(logoutSchema), authController.logout.bind(authController));
router.post('/password/change', passwordChangeLimiter, authenticate, validate(changePasswordSchema), authController.changePassword.bind(authController));
router.get('/profile', authenticate, authController.getProfile.bind(authController));

export default router;
