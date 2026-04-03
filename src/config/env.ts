import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  CORS_ORIGIN: z.string().optional(),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  MAIL_FROM: z.string().email().optional(),
  EMAIL_PROVIDER: z.enum(['nodemailer', 'resend', 'auto']).default('nodemailer'),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_DAILY_LIMIT: z.string().default('1000'),
}).superRefine((vars, ctx) => {
  if (vars.NODE_ENV !== 'production') return;

  const requiredInProduction: Array<keyof typeof vars> = ['DIRECT_URL', 'JWT_REFRESH_SECRET', 'REDIS_URL', 'CORS_ORIGIN'];

  for (const key of requiredInProduction) {
    if (!vars[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required in production`,
      });
    }
  }

  const hasAnySmtp = Boolean(vars.SMTP_HOST || vars.SMTP_PORT || vars.SMTP_USER || vars.SMTP_PASS || vars.MAIL_FROM);
  const hasAllSmtp = Boolean(vars.SMTP_HOST && vars.SMTP_PORT && vars.SMTP_USER && vars.SMTP_PASS && vars.MAIL_FROM);

  if (hasAnySmtp && !hasAllSmtp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SMTP_HOST'],
      message: 'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM must all be set together',
    });
  }

  if (!/^\d+$/.test(vars.RESEND_DAILY_LIMIT)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['RESEND_DAILY_LIMIT'],
      message: 'RESEND_DAILY_LIMIT must be a positive integer string',
    });
  }

  if (vars.EMAIL_PROVIDER === 'resend' && !vars.RESEND_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['RESEND_API_KEY'],
      message: 'RESEND_API_KEY is required when EMAIL_PROVIDER=resend',
    });
  }

  if (vars.EMAIL_PROVIDER === 'nodemailer' && !hasAllSmtp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SMTP_HOST'],
      message: 'SMTP configuration is required when EMAIL_PROVIDER=nodemailer',
    });
  }

  if (vars.EMAIL_PROVIDER === 'auto' && (!vars.RESEND_API_KEY || !hasAllSmtp)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['EMAIL_PROVIDER'],
      message: 'EMAIL_PROVIDER=auto requires both RESEND_API_KEY and full SMTP configuration',
    });
  }
});

export const env = envSchema.parse(process.env);
