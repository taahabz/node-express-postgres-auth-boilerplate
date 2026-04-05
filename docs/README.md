# Docs home

Use this index as the startup path for new template users.

## Recommended order
1. [DOCKER.md](DOCKER.md) — get local API + Redis running quickly.
2. [server-setup.md](server-setup.md) — prepare server and GitHub settings.
3. [Deploy-workflow.md](Deploy-workflow.md) — production deploy automation (AWS/GCP notes included).

## Fast paths by goal

### Local development only
- Follow [DOCKER.md](DOCKER.md)
- Use `cp example.env .env`
- Run `npm run dev` or `docker compose up -d --build`

### Deploy to AWS EC2
- Follow [server-setup.md](server-setup.md)
- Then complete [Deploy-workflow.md](Deploy-workflow.md)

### Deploy to GCP VM
- Follow [Deploy-workflow.md](Deploy-workflow.md)
- Use same GitHub secret names (`EC2_*`) for compatibility

## Required production assumption
- GHCR image package stays private.
- Server pulls with `GHCR_USERNAME` + `GHCR_PAT`.
