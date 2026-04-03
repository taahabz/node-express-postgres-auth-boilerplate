import { beforeEach, describe, expect, it, vi } from 'vitest';

const createTransportMock = vi.fn();
const resendSendMock = vi.fn();
const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
}));

const loadModule = async (overrides: {
  emailProvider: 'nodemailer' | 'resend' | 'auto';
  resendDailyLimit?: string;
  resendUsage?: number;
}) => {
  vi.resetModules();

  const env = {
    NODE_ENV: 'test',
    PORT: '3000',
    CORS_ORIGIN: 'http://localhost:5173',
    APP_BASE_URL: 'http://localhost:3000',
    JWT_SECRET: 'test-jwt-secret',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/test_db',
    EMAIL_PROVIDER: overrides.emailProvider,
    RESEND_DAILY_LIMIT: overrides.resendDailyLimit ?? '1000',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'smtp-user',
    SMTP_PASS: 'smtp-pass',
    MAIL_FROM: 'no-reply@example.com',
    RESEND_API_KEY: 're_test_key',
  } as const;

  createTransportMock.mockReturnValue({ sendMail: vi.fn() });
  resendSendMock.mockReset();
  redisMock.get.mockResolvedValue(String(overrides.resendUsage ?? 0));
  redisMock.incr.mockResolvedValue((overrides.resendUsage ?? 0) + 1);
  redisMock.expire.mockResolvedValue(1);

  vi.doMock('../src/config/env.js', () => ({ env }));
  vi.doMock('../src/config/redis.js', () => ({ redis: redisMock }));
  vi.doMock('nodemailer', () => ({
    default: {
      createTransport: createTransportMock,
    },
  }));
  vi.doMock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: resendSendMock,
      },
    })),
  }));

  return import('../src/config/email.js');
};

describe('email config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses nodemailer when configured for SMTP mode', async () => {
    const module = await loadModule({ emailProvider: 'nodemailer' });
    const sendMailMock = createTransportMock.mock.results[0]?.value?.sendMail as ReturnType<typeof vi.fn>;

    await module.sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Hello',
      html: '<p>Hello</p>',
    });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it('uses resend when configured for resend mode', async () => {
    const module = await loadModule({ emailProvider: 'resend' });

    await module.sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Hello',
      html: '<p>Hello</p>',
    });

    expect(resendSendMock).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledTimes(1);
  });

  it('uses resend in auto mode until daily limit is reached', async () => {
    const module = await loadModule({ emailProvider: 'auto', resendDailyLimit: '2', resendUsage: 1 });

    await module.sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Hello',
      html: '<p>Hello</p>',
    });

    expect(resendSendMock).toHaveBeenCalledTimes(1);
    expect(redisMock.incr).toHaveBeenCalledTimes(1);
  });

  it('falls back to smtp in auto mode after resend limit', async () => {
    const module = await loadModule({ emailProvider: 'auto', resendDailyLimit: '2', resendUsage: 2 });
    const sendMailMock = createTransportMock.mock.results[0]?.value?.sendMail as ReturnType<typeof vi.fn>;

    await module.sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Hello',
      html: '<p>Hello</p>',
    });

    expect(resendSendMock).not.toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });
});
