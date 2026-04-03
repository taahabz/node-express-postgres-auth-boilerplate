import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
