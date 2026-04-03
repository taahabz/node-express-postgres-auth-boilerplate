import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface TokenPayload extends jwt.JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

interface JwtHeaderPayload extends jwt.JwtPayload {
  type?: 'access' | 'refresh';
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in environment.');
}

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? JWT_SECRET;

const parseTokenPayload = (decoded: string | jwt.JwtPayload): TokenPayload => {
  if (
    typeof decoded !== 'string' &&
    typeof decoded.userId === 'string' &&
    typeof decoded.email === 'string' &&
    (decoded.type === 'access' || decoded.type === 'refresh')
  ) {
    return decoded as TokenPayload;
  }

  throw new Error('Invalid token payload');
};

// Access token: Short-lived (15 minutes)
export const generateAccessToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email, type: 'access' }, JWT_SECRET, { expiresIn: '15m' });
};

// Refresh token: Long-lived (30 days)
export const generateRefreshToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
};

// Generate unique refresh token identifier
export const generateRefreshTokenId = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const verifyAccessToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, JWT_SECRET);
  return parseTokenPayload(decoded);
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
  return parseTokenPayload(decoded);
};

// Generate secure random token for password reset / email verification
export const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Get token expiry date
export const getRefreshTokenExpiry = (): Date => {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
};

export const getPasswordResetExpiry = (): Date => {
  return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
};

export const getTokenExpiryDate = (token: string): Date | null => {
  const decoded = jwt.decode(token) as JwtHeaderPayload | null;

  if (!decoded?.exp) {
    return null;
  }

  return new Date(decoded.exp * 1000);
};
