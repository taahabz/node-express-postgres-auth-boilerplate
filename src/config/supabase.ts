import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in environment.');
}

export const generateToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): { userId: string; email: string } => {
  return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
};
