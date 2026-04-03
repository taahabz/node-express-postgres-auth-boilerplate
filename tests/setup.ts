process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-jwt-refresh-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/test_db';
process.env.DIRECT_URL = process.env.DIRECT_URL ?? 'postgresql://user:pass@localhost:5432/test_db';
delete process.env.REDIS_URL;
process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';
