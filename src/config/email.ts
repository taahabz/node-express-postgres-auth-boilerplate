import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from './env.js';
import { redis } from './redis.js';

const smtpEnabled = Boolean(
  env.SMTP_HOST &&
    env.SMTP_PORT &&
    env.SMTP_USER &&
    env.SMTP_PASS &&
    env.MAIL_FROM
);

const resendEnabled = Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
const resendDailyLimit = Number(env.RESEND_DAILY_LIMIT);

const inMemoryUsage = new Map<string, number>();

const transporter = smtpEnabled
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: Number(env.SMTP_PORT) === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

const resend = resendEnabled ? new Resend(env.RESEND_API_KEY) : null;

const getDailyCounterKey = (): string => {
  const date = new Date().toISOString().slice(0, 10);
  return `email:resend:daily:${date}`;
};

const getResendUsage = async (): Promise<number> => {
  const key = getDailyCounterKey();

  if (!redis) {
    return inMemoryUsage.get(key) ?? 0;
  }

  const value = await redis.get(key);
  return value ? Number(value) : 0;
};

const incrementResendUsage = async (): Promise<void> => {
  const key = getDailyCounterKey();

  if (!redis) {
    const current = inMemoryUsage.get(key) ?? 0;
    inMemoryUsage.set(key, current + 1);
    return;
  }

  const next = await redis.incr(key);
  if (next === 1) {
    const now = new Date();
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const ttlSeconds = Math.max(1, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
    await redis.expire(key, ttlSeconds);
  }
};

const sendWithResend = async (args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> => {
  if (!resend || !env.MAIL_FROM) {
    throw new Error('Resend is not configured');
  }

  await resend.emails.send({
    from: env.MAIL_FROM,
    to: [args.to],
    subject: args.subject,
    text: args.text,
    html: args.html,
  });

  await incrementResendUsage();
};

const sendWithSmtp = async (args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> => {
  if (!transporter || !env.MAIL_FROM) {
    throw new Error('SMTP transport is not configured');
  }

  await transporter.sendMail({
    from: env.MAIL_FROM,
    ...args,
  });
};

export const isEmailEnabled = (): boolean => {
  if (env.EMAIL_PROVIDER === 'resend') return resendEnabled;
  if (env.EMAIL_PROVIDER === 'nodemailer') return smtpEnabled;
  return resendEnabled || smtpEnabled;
};

export const sendEmail = async (args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> => {
  if (env.EMAIL_PROVIDER === 'resend') {
    await sendWithResend(args);
    return;
  }

  if (env.EMAIL_PROVIDER === 'nodemailer') {
    await sendWithSmtp(args);
    return;
  }

  const resendUsage = await getResendUsage();

  if (resendUsage < resendDailyLimit && resendEnabled) {
    await sendWithResend(args);
    return;
  }

  await sendWithSmtp(args);
};
