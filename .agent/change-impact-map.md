# Change impact map for agents

Use this map to avoid partial changes.

## 1) Route or controller changes
If you change:
- files under [../src/routes](../src/routes)
- files under [../src/controllers](../src/controllers)
- files under [../src/services](../src/services)

Then verify/update:
- validation schemas under [../src/validators](../src/validators)
- auth/authorize middleware usage
- tests under [../tests](../tests)
- docs under [../README.md](../README.md) and [../docs](../docs)
- OpenAPI spec [../openapi/openapi.yaml](../openapi/openapi.yaml) if endpoint contract changed

## 2) Env/config changes
If you change:
- [../src/config/env.ts](../src/config/env.ts)
- [../example.env](../example.env)

Then verify/update:
- deploy docs [../docs/Deploy-workflow.md](../docs/Deploy-workflow.md)
- server setup docs [../docs/server-setup.md](../docs/server-setup.md)
- `.agent` references in [project-context.md](project-context.md) and [context.json](context.json)

## 3) Workflow/deployment changes
If you change:
- [../.github/workflows/backend-docker-publish.yml](../.github/workflows/backend-docker-publish.yml)
- [../.github/workflows/backend-deploy.yml](../.github/workflows/backend-deploy.yml)
- [../docker-compose.deploy.yml](../docker-compose.deploy.yml)

Then verify/update:
- [../docs/Deploy-workflow.md](../docs/Deploy-workflow.md)
- [../docs/server-setup.md](../docs/server-setup.md)
- secret contract docs in `.agent`
- image naming consistency (`<app-name>-backend` template contract)

## 4) Template reset behavior changes
If you move/rename docs or paths consumed by template users, update:
- [../reset-template.config.json](../reset-template.config.json)
- [../README.md](../README.md)
- relative links inside moved docs

## 5) RBAC/authorization changes
If you change:
- [../src/config/rbac.ts](../src/config/rbac.ts)
- authorize middleware under [../src/middleware](../src/middleware)

Then verify/update:
- protected route expectations in [api-surface.md](api-surface.md)
- tests for role checks under [../tests](../tests)
- docs mentioning ADMIN-only metrics or role model

## 6) Rate-limiter behavior changes
If you change:
- [../src/middleware/rateLimiter.middleware.ts](../src/middleware/rateLimiter.middleware.ts)

Then verify/update:
- auth route expectations
- observability/metrics semantics (rate-limit hit counters)
- tests for limiter behavior under [../tests](../tests)
- docs describing request limits
