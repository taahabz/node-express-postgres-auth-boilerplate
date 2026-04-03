import { describe, expect, it, vi } from 'vitest';
import { authorize } from '../src/middleware/authorize.middleware.js';
import { AppError } from '../src/types/index.js';

describe('authorize middleware', () => {
  it('allows when role matches', () => {
    const req = {
      user: {
        id: 'u1',
        email: 'admin@example.com',
        roles: ['ADMIN'],
        permissions: ['users:manage'],
      },
    } as any;
    const next = vi.fn();

    authorize({ roles: ['ADMIN'] })(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects when permissions are insufficient', () => {
    const req = {
      user: {
        id: 'u1',
        email: 'user@example.com',
        roles: ['USER'],
        permissions: ['profile:read'],
      },
    } as any;
    const next = vi.fn();

    authorize({ permissions: ['users:manage'] })(req, {} as any, next);

    const [err] = next.mock.calls[0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });
});
