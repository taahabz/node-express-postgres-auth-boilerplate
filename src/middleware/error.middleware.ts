import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../types/index.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  void _next;

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(env.NODE_ENV === 'development' && { details: err.message }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
};
