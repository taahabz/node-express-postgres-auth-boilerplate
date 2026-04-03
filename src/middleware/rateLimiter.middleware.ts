import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import crypto from 'node:crypto';
import { redis } from '../config/redis.js';

const createStore = (prefix: string) => {
  const client = redis;
  if (!client) return undefined;

  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]) => {
      const [command, ...commandArgs] = args;
      return client.call(command, ...commandArgs) as Promise<any>;
    },
  });
};

const hashKey = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

const fallbackIpKey = (ip: string | undefined): string => (ip && ip.length > 0 ? ip : 'unknown');

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  // Keep API available if Redis/store has transient issues.
  passOnStoreError: true,
};

export const authLimiter = rateLimit({
  store: createStore('rl:auth:'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { success: false, error: 'Too many authentication attempts, please try again later' },
  ...baseOptions,
});

export const refreshLimiter = rateLimit({
  store: createStore('rl:refresh:'),
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    const token = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
    if (token) {
      return `refresh:${hashKey(token)}`;
    }
    return `refresh:ip:${fallbackIpKey(req.ip)}`;
  },
  message: { success: false, error: 'Too many token refresh attempts, please try again later' },
  ...baseOptions,
});

export const logoutLimiter = rateLimit({
  store: createStore('rl:logout:'),
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      return `logout:${hashKey(token)}`;
    }
    return `logout:ip:${fallbackIpKey(req.ip)}`;
  },
  message: { success: false, error: 'Too many logout attempts, please try again later' },
  ...baseOptions,
});

export const passwordResetRequestLimiter = rateLimit({
  store: createStore('rl:password:request-reset:'),
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email) {
      return `password-request:${hashKey(email)}`;
    }
    return `password-request:ip:${fallbackIpKey(req.ip)}`;
  },
  message: { success: false, error: 'Too many password reset requests, please try again later' },
  ...baseOptions,
});

export const passwordResetLimiter = rateLimit({
  store: createStore('rl:password:reset:'),
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    if (token) {
      return `password-reset:${hashKey(token)}`;
    }
    return `password-reset:ip:${fallbackIpKey(req.ip)}`;
  },
  message: { success: false, error: 'Too many password reset attempts, please try again later' },
  ...baseOptions,
});

export const passwordChangeLimiter = rateLimit({
  store: createStore('rl:password:change:'),
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      return `password-change:${hashKey(token)}`;
    }
    return `password-change:ip:${fallbackIpKey(req.ip)}`;
  },
  message: { success: false, error: 'Too many password change attempts, please try again later' },
  ...baseOptions,
});

export const emailOtpSendLimiter = rateLimit({
  store: createStore('rl:email:otp:send:'),
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email) {
      return `email-otp-send:${hashKey(email)}`;
    }
    return `email-otp-send:ip:${fallbackIpKey(req.ip)}`;
  },
  message: { success: false, error: 'Too many OTP requests, please try again later' },
  ...baseOptions,
});

export const emailOtpVerifyLimiter = rateLimit({
  store: createStore('rl:email:otp:verify:'),
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email) {
      return `email-otp-verify:${hashKey(email)}`;
    }
    return `email-otp-verify:ip:${fallbackIpKey(req.ip)}`;
  },
  message: { success: false, error: 'Too many OTP verification attempts, please try again later' },
  ...baseOptions,
});

export const apiLimiter = rateLimit({
  store: createStore('rl:api:'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { success: false, error: 'Too many requests, please try again later' },
  ...baseOptions,
});
