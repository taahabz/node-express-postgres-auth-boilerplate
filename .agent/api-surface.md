# API surface reference for agents

Base prefix: `/api`

Route registration source: [../src/routes/index.ts](../src/routes/index.ts)

## Health routes
Source: [../src/routes/health.routes.ts](../src/routes/health.routes.ts)

- `GET /api/health`
  - Public
  - Returns service status `{ success: true, data: { status: 'ok' } }`

- `GET /api/health/db`
  - Public
  - Performs Prisma DB probe (`SELECT 1`)

## Auth routes
Source: [../src/routes/auth.routes.ts](../src/routes/auth.routes.ts)

Public:
- `POST /api/auth/signup` (rate limited, request validated)
- `POST /api/auth/login` (rate limited, request validated)
- `POST /api/auth/refresh` (rate limited, request validated)
- `POST /api/auth/verify-email/otp/request` (rate limited, request validated)
- `POST /api/auth/verify-email/otp/verify` (rate limited, request validated)
- `POST /api/auth/password/request-reset` (rate limited, request validated)
- `POST /api/auth/password/reset` (rate limited, request validated)

Protected:
- `POST /api/auth/logout` (rate limited + `authenticate` + request validated)
- `POST /api/auth/password/change` (rate limited + `authenticate` + request validated)
- `GET /api/auth/profile` (`authenticate`)

## Metrics routes
Source: [../src/routes/metrics.routes.ts](../src/routes/metrics.routes.ts)

- `GET /api/metrics`
  - Requires `authenticate`
  - Requires `requireRoles('ADMIN')`
  - Returns in-process metrics snapshot

## Documentation routes
Source: [../src/routes/docs.routes.ts](../src/routes/docs.routes.ts)

- `GET /api/docs` (Swagger UI HTML)
- `GET /api/docs/swagger-init.js`
- `GET /api/docs/assets/*` (Swagger static assets)
- `GET /api/openapi.yaml` (OpenAPI YAML)

## Middleware assumptions impacting all routes
From [../src/app.ts](../src/app.ts):
- Global `apiLimiter` applies before route handling.
- CORS behavior differs by `NODE_ENV` and `CORS_ORIGIN`.
- `trust proxy` is enabled in production (single hop).

## Agent notes
- If adding/changing routes, update docs and tests.
- If changing auth guards/roles, update RBAC assumptions in [.agent/project-context.md](project-context.md).
- If adding new route families, ensure they are mounted in [../src/routes/index.ts](../src/routes/index.ts).
