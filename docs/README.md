# Docs home

Use this quick index.

## Recommended order
1. [DOCKER.md](DOCKER.md) — get local API + Redis running quickly.
2. [setup-action-workflows.md](setup-action-workflows.md) — simple EC2 + GitHub Actions deploy steps.

## Fast paths by goal

### Local development only
- Follow [DOCKER.md](DOCKER.md)
- Use `cp example.env .env`
- Run `npm run dev` or `docker compose up -d --build`

### Deploy to AWS EC2
- Follow [setup-action-workflows.md](setup-action-workflows.md)

### Deploy to GCP VM
- Follow [setup-action-workflows.md](setup-action-workflows.md)
- Use the same GitHub secret names (`DEPLOY_*`) for compatibility

## Required production assumption
- Server receives source over SSH and builds locally with Docker Compose.
