# Docs home

Use this index as the startup path for new template users.

## Recommended order
1. [DOCKER.md](DOCKER.md) — get local API + Redis running quickly.
2. [setup-action-workflows.md](setup-action-workflows.md) — step-by-step EC2 and GitHub Actions production setup.

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
- Keep the deploy host fingerprint secret for strict host verification.
