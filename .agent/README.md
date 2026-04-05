# .agent context pack

This folder stores persistent context for AI coding agents operating in this backend template.

## Purpose
- Reduce repeated discovery time before making changes.
- Keep architecture, deployment, and environment assumptions explicit.
- Make agent output reproducible for template users who clone/reset this repo.
- Improve handoff quality between multiple agent sessions.

## Recommended read order for agents
1. [context.json](context.json) (machine-readable contract)
2. [project-context.md](project-context.md) (system map + constraints)
3. [operations-playbook.md](operations-playbook.md) (execution and validation flow)
4. [api-surface.md](api-surface.md) (endpoints + auth/role requirements)
5. [change-impact-map.md](change-impact-map.md) (what must be updated together)
6. [handoff-template.md](handoff-template.md) (final response format)

## Files in this folder
- [context.json](context.json): Machine-readable project/deploy/env contract.
- [project-context.md](project-context.md): Architecture, stack, secrets, workflows, and invariants.
- [operations-playbook.md](operations-playbook.md): Step-by-step safe-change and verification workflow.
- [api-surface.md](api-surface.md): Current API routes, protections, and docs endpoints.
- [change-impact-map.md](change-impact-map.md): Coupling map so changes stay complete.
- [handoff-template.md](handoff-template.md): Standard completion note format.

## Agent priorities (in order)
1. Correctness and security
2. Template reproducibility
3. Minimal, targeted diff
4. Docs/link consistency
5. Developer ergonomics

## Hard constraints
- GHCR package is expected to stay private.
- Deployment should continue to work for both AWS EC2 and GCP VM users using the same secret names.
- Path changes must update docs and links.
- Template rename compatibility must be preserved via [../reset-template.config.json](../reset-template.config.json).

## Primary external docs in repo
- Runtime/container docs: [../docs/DOCKER.md](../docs/DOCKER.md)
- Server bootstrap docs: [../docs/server-setup.md](../docs/server-setup.md)
- Full deploy docs: [../docs/Deploy-workflow.md](../docs/Deploy-workflow.md)

## Maintenance triggers (must update .agent pack)
Update this folder whenever any of these change:
- Workflows under [../.github/workflows](../.github/workflows)
- Deployment docs under [../docs](../docs)
- Environment variables in [../example.env](../example.env)
- Runtime/build scripts in [../package.json](../package.json)
- Compose files [../docker-compose.yml](../docker-compose.yml) or [../docker-compose.deploy.yml](../docker-compose.deploy.yml)
- Route/middleware wiring under [../src/routes](../src/routes) or [../src/app.ts](../src/app.ts)
