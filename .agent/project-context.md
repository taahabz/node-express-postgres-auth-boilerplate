# Project context for agents

## Repository type
Node.js + TypeScript backend template intended to be cloned/reset by downstream users.

## Runtime profile
- Language: TypeScript (ESM)
- Framework: Express 5
- ORM: Prisma (PostgreSQL)
- Cache/rate-limit store: Redis
- Auth: JWT access + refresh token model
- Test runner: Vitest

## Canonical source of truth (ordered)
1. Runtime behavior: [../src](../src)
2. Data model: [../prisma/schema.prisma](../prisma/schema.prisma)
3. Environment contract: [../src/config/env.ts](../src/config/env.ts) and [../example.env](../example.env)
4. Infra/deploy model: [../docker-compose.yml](../docker-compose.yml), [../docker-compose.deploy.yml](../docker-compose.deploy.yml)
5. CI/CD behavior: [../.github/workflows](../.github/workflows)
6. Human docs: [../docs](../docs)

## Important directories
- API source: [../src](../src)
- Config: [../src/config](../src/config)
- Middleware: [../src/middleware](../src/middleware)
- Routes: [../src/routes](../src/routes)
- Services: [../src/services](../src/services)
- Validators: [../src/validators](../src/validators)
- DB schema/migrations: [../prisma](../prisma)
- OpenAPI spec: [../openapi/openapi.yaml](../openapi/openapi.yaml)
- Tests: [../tests](../tests)
- Workflows: [../.github/workflows](../.github/workflows)
- Human docs: [../docs](../docs)

## Request pipeline (middleware order)
As wired in [../src/app.ts](../src/app.ts):
1. `helmet`
2. `cors` (production allowlist from `CORS_ORIGIN`)
3. JSON/urlencoded body parsers (`1mb` limit)
4. `morgan`
5. `observabilityMiddleware`
6. Global `apiLimiter`
7. `/api` routes
8. `notFoundHandler`
9. `errorHandler`

Implication for agents:
- Any security/performance change in middleware order can alter API behavior globally.
- Rate-limit semantics should be verified when changing auth routes or keying logic.

## Route map entrypoints
From [../src/routes/index.ts](../src/routes/index.ts):
- `/api/health` -> health routes
- `/api/auth` -> auth routes
- `/api/metrics` -> metrics routes (authenticated admin)
- `/api/docs` and `/api/openapi.yaml` -> docs routes

## Auth and security model highlights
- Access + refresh token flow with refresh rotation (service/controller layer).
- Account lockout and password reset flows exist.
- RBAC foundation in [../src/config/rbac.ts](../src/config/rbac.ts).
- Metrics route protected by `authenticate` + `requireRoles('ADMIN')`.

## Rate limiting model highlights
From [../src/middleware/rateLimiter.middleware.ts](../src/middleware/rateLimiter.middleware.ts):
- API-wide limit: 100/15m
- Auth limit: 5/15m
- Refresh/logout and password/email OTP limits have dedicated stores and key generators.
- Redis-backed store when Redis is available.
- `passOnStoreError: true` keeps API available on transient store issues.

## Data model highlights
From [../prisma/schema.prisma](../prisma/schema.prisma):
- Core models: `User`, `RefreshToken`, `TokenBlacklist`
- RBAC models: `Role`, `Permission`, `UserRole`, `RolePermission`
- Security fields on user include lockout counters and email verification OTP metadata.

## Runtime and quality commands
- Install: `npm ci`
- Generate Prisma client: `npm run prisma:generate`
- Type check: `npm run check`
- Lint: `npm run lint`
- Build: `npm run build`
- Tests: `npm test`
- Local dev: `npm run dev`

## Container/deploy model
- Local compose (build from local source): [../docker-compose.yml](../docker-compose.yml)
- Deploy compose (pull prebuilt image): [../docker-compose.deploy.yml](../docker-compose.deploy.yml)
- CI validation: [../.github/workflows/backend-ci.yml](../.github/workflows/backend-ci.yml)
- GHCR publish: [../.github/workflows/backend-docker-publish.yml](../.github/workflows/backend-docker-publish.yml)
- VM deploy: [../.github/workflows/backend-deploy.yml](../.github/workflows/backend-deploy.yml)

## GHCR policy
- GHCR package should remain private.
- Server pulls image using `GHCR_USERNAME` + `GHCR_PAT`.

## Deployment secret contract
Required secrets:
- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_PRIVATE_KEY`
- `EC2_HOST_FINGERPRINT`
- `GHCR_USERNAME`
- `GHCR_PAT`

Optional secrets:
- `EC2_PORT` (default `22`)
- `DEPLOY_PATH` (default `/opt/apps/<repo-name>`)

## Environment contract (production critical)
Production-required in env validation:
- `DIRECT_URL`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `CORS_ORIGIN`

Conditional provider requirements:
- `EMAIL_PROVIDER=resend` requires `RESEND_API_KEY`
- `EMAIL_PROVIDER=nodemailer` requires full SMTP set
- `EMAIL_PROVIDER=auto` requires both `RESEND_API_KEY` and full SMTP set

## Template invariants
- Keep template-friendly naming and avoid app-specific hardcoding.
- Preserve reset behavior in [../reset-template.config.json](../reset-template.config.json).
- If file paths move, update docs links and reset mapping.
- Keep deploy workflow generic for both AWS EC2 and GCP VM usage.

## Agent constraints
- Preserve template reproducibility.
- Prefer minimal diffs.
- Do not hardcode app-specific names when avoidable.
- Keep links and docs updated when moving files.
- Validate changed files after edits.
