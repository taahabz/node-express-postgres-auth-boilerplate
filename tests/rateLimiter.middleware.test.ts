import { beforeEach, describe, expect, it, vi } from 'vitest';

const rateLimitMock = vi.fn((options) => options);

vi.mock('express-rate-limit', () => ({
  default: rateLimitMock,
}));

vi.mock('rate-limit-redis', () => ({
  RedisStore: class RedisStoreMock {},
}));

vi.mock('../src/config/redis.js', () => ({
  redis: null,
}));

describe('rate limiter middleware', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await vi.resetModules();
  });

  it('configures protected limiters with strict windows and custom keying', async () => {
    await import('../src/middleware/rateLimiter.middleware.js');

    const configs = rateLimitMock.mock.calls.map(([options]) => options as Record<string, unknown>);

    expect(configs[0].max).toBe(5);
    expect(configs[1].max).toBe(20);
    expect(configs[2].max).toBe(20);
    expect(configs[3].max).toBe(3);
    expect(configs[4].max).toBe(5);
    expect(configs[5].max).toBe(5);
    expect(configs[6].max).toBe(5);
    expect(configs[7].max).toBe(10);
    expect(configs[8].max).toBe(100);
    expect(configs.every((config) => config.passOnStoreError === true)).toBe(true);
  });

  it('hashes sensitive keys instead of using raw values', async () => {
    await import('../src/middleware/rateLimiter.middleware.js');
    const [, refreshConfig, logoutConfig, , , , emailOtpSendConfig, emailOtpVerifyConfig] = rateLimitMock.mock.calls.map(
      ([options]) => options as Record<string, unknown>,
    );

    const refreshKey = (refreshConfig.keyGenerator as (req: any) => string)({
      body: { refreshToken: 'refresh-token-secret' },
      ip: '127.0.0.1',
    } as any);

    const logoutKey = (logoutConfig.keyGenerator as (req: any) => string)({
      headers: { authorization: 'Bearer access-token-secret' },
      ip: '127.0.0.1',
    } as any);

    const otpSendKey = (emailOtpSendConfig.keyGenerator as (req: any) => string)({
      body: { email: 'USER@example.com' },
      ip: '127.0.0.1',
    } as any);

    const otpKey = (emailOtpVerifyConfig.keyGenerator as (req: any) => string)({
      body: { email: 'USER@example.com' },
      ip: '127.0.0.1',
    } as any);

    expect(refreshKey).toMatch(/^refresh:[a-f0-9]{64}$/);
    expect(logoutKey).toMatch(/^logout:[a-f0-9]{64}$/);
    expect(otpSendKey).toMatch(/^email-otp-send:[a-f0-9]{64}$/);
    expect(otpKey).toMatch(/^email-otp-verify:[a-f0-9]{64}$/);
    expect(refreshKey).not.toContain('refresh-token-secret');
    expect(logoutKey).not.toContain('access-token-secret');
    expect(otpKey).not.toContain('USER@example.com');
  });
});
