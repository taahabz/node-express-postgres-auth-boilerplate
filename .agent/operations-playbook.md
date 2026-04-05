# Operations playbook for agents

## 1) Safe change sequence
1. Read relevant docs in [../docs](../docs) and [../README.md](../README.md).
2. Identify impacted surfaces using [change-impact-map.md](change-impact-map.md).
3. Read source-of-truth files before editing.
4. Apply the smallest correct code/doc/config diff.
5. Validate with the minimum sufficient command set.
6. If file paths changed, fix links + reset-template mappings.
7. Produce handoff summary using [handoff-template.md](handoff-template.md).

## 2) Command matrix

### Baseline commands
- `npm run check`
- `npm run lint`
- `npm test`

### App behavior changes (controllers/services/middleware/routes)
Minimum:
- `npm run check`
- `npm run lint`
- `npm test`

Also verify affected route behavior from [api-surface.md](api-surface.md).

### Env/config contract changes
Minimum:
- `npm run check`
- `npm run lint`

Plus:
- Update [../example.env](../example.env)
- Update [../docs/server-setup.md](../docs/server-setup.md)
- Update [project-context.md](project-context.md)

### Workflow/deploy changes
Minimum:
- Validate workflow YAML structure
- Ensure secret/input names are documented

Plus:
- Cross-check [../docs/Deploy-workflow.md](../docs/Deploy-workflow.md)
- Ensure path references still resolve after moves

### Compose changes
Minimum:
- Verify service names/env vars align across:
	- [../docker-compose.yml](../docker-compose.yml)
	- [../docker-compose.deploy.yml](../docker-compose.deploy.yml)
	- [../.github/workflows/backend-deploy.yml](../.github/workflows/backend-deploy.yml)
	- [../docs/Deploy-workflow.md](../docs/Deploy-workflow.md)

## 3) Documentation sync rules
Update docs whenever behavior changes, not only when requested.

Mandatory sync examples:
- New workflow secret -> docs + `.agent` context updates
- Moved file path -> README links + internal relative links + reset mapping
- New route -> API docs mapping updates
- Changed env variable semantics -> `example.env` + docs + `.agent/context.json`

## 4) Release/deploy quick checks
- CI workflow green on `main`.
- Docker publish workflow green on `main`.
- Deploy workflow green on `main` (or manual dispatch).
- Server endpoint `GET /api/health` returns success.

## 5) Rollback strategy (operator guidance)
If deployment fails after image update:
1. Re-run deploy workflow manually with previous known-good `image_tag`.
2. Verify container status with `docker compose -f docker-compose.deploy.yml ps`.
3. Verify app logs and health endpoint.

If workflow fails before remote apply:
1. Fix secret/path issue in GitHub settings.
2. Re-run failed workflow.

## 6) Common pitfalls
- Moving docs without fixing relative links.
- Using public GHCR assumptions while package is private.
- Breaking template reset replacements in [../reset-template.config.json](../reset-template.config.json).
- Hardcoding environment-specific values.
- Changing route prefixes without updating docs and OpenAPI wiring.
- Editing compose service names without aligning `REDIS_URL` and deployment commands.
