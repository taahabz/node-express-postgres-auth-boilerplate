# Server Setup (GitHub + AWS EC2)

This guide is for this backend template when used as its own repo.

## 1) One-time template initialization

After cloning this template:

1. Install deps:
   - `npm install`
2. Reset template with your app name:
   - `npm run reset --name your-app-name`
3. Create first commit in the new git history:
   - `git add .`
   - `git commit -m "chore: initialize from template"`
4. Add your new remote and push:
   - `git remote add origin <your-new-repo-url>`
   - `git push -u origin main`

What this reset does:
- Applies minimal renames from [reset-template.config.json](reset-template.config.json)
- Writes [ .template-reset.json](.template-reset.json) with your app name
- Removes old git history and re-initializes repo on `main`

---

## 2) GitHub setup

## 2.1 Repository settings

1. Create a new GitHub repo.
2. Push your initialized backend repo to `main`.
3. In repo settings:
   - Enable Actions (default is enabled)
   - Keep default branch as `main`

## 2.2 Workflows included

- CI: [ .github/workflows/backend-ci.yml](.github/workflows/backend-ci.yml)
  - Runs on push/pull request to `main`
  - Runs install + Prisma generate + type check
- Docker publish: [ .github/workflows/backend-docker-publish.yml](.github/workflows/backend-docker-publish.yml)
  - Runs on push to `main` (and manual dispatch)
  - Publishes image to GHCR

## 2.3 GHCR package visibility

Published image path format:
- `ghcr.io/<github-owner>/<app-name>-backend`

If deployment host cannot authenticate to private GHCR packages, either:
- make package public, or
- use a PAT on server with `read:packages`.

## 2.4 GitHub secrets (recommended now)

Add these in **Settings → Secrets and variables → Actions**:

- `EC2_HOST` (public IP/DNS)
- `EC2_USER` (for example `ubuntu`)
- `EC2_SSH_PRIVATE_KEY` (private key content for your EC2 key pair)
- `EC2_PORT` (optional, default `22`)
- `GHCR_USERNAME` (your GitHub username)
- `GHCR_PAT` (PAT with at least `read:packages` for server pulls)

These are required when you add an EC2 deploy workflow.

## 2.5 What is `GHCR_PAT` and how to get it

`GHCR_PAT` is a GitHub Personal Access Token used by your EC2 server to run `docker login ghcr.io` and pull private images from GitHub Container Registry.

When it is needed:
- Needed if your package `ghcr.io/<owner>/<app-name>-backend` is private
- Not needed if package is public

How to create it (quick path):
1. Open GitHub → Settings → Developer settings → Personal access tokens.
2. Create a token:
   - Fine-grained token (recommended) or classic token
3. Grant package read permission:
   - Fine-grained: repository access to this repo + Packages permission `Read`
   - Classic: scope `read:packages`
4. Copy token value immediately (GitHub shows it once).
5. Add token to repo secret:
   - Settings → Secrets and variables → Actions → New repository secret
   - Name: `GHCR_PAT`
   - Value: your token

How to test on EC2:
- `echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin`
- `docker pull ghcr.io/<owner>/<app-name>-backend:latest`

---

## 3) AWS EC2 setup

## 3.1 Launch EC2

Recommended baseline:
- Ubuntu 22.04 LTS
- t3.small (or higher for production)
- 20+ GB gp3 volume

Security Group inbound rules:
- TCP 22 from your IP only
- TCP 80 from `0.0.0.0/0`
- TCP 443 from `0.0.0.0/0`
- Optional TCP 3000 only if directly exposing Node (not recommended for prod)

## 3.2 Connect and harden basics

1. SSH to instance using your key.
2. Update system packages.
3. Create a deploy user (optional but recommended).
4. Configure firewall (UFW) consistently with security group rules.

## 3.3 Install Docker + Compose plugin

Install Docker Engine and Docker Compose plugin on EC2.

Verify:
- `docker --version`
- `docker compose version`

(Optional) Add user to docker group and re-login.

## 3.4 Prepare app directory

Create a stable directory, for example:
- `/opt/apps/<app-name>`

Copy or clone your backend repo there.

## 3.5 Configure environment on server

1. Copy template env:
   - `cp example.env .env`
2. Set production values in `.env`:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `PORT`
   - `REDIS_PASSWORD`
   - `REDIS_URL`

Important:
- Never commit server `.env`
- Use strong secrets for JWT and Redis password

## 3.6 Redis setup on a clean EC2

This template runs Redis using Docker Compose in the same EC2 host.

1. Keep Redis password in `.env`:
   - `REDIS_PASSWORD=<strong-random-password>`
2. Use app-to-Redis connection via Docker internal DNS:
   - `REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379`
3. Start services:
   - `docker compose up -d --build`
4. Check Redis container:
   - `docker compose ps`
   - `docker compose logs redis --tail=50`
5. Validate Redis responds:
   - `docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping`
   - Expected: `PONG`

Security notes for Redis on EC2:
- Do not expose port `6379` publicly to internet.
- Keep EC2 Security Group without inbound `6379` from `0.0.0.0/0`.
- Use strong `REDIS_PASSWORD`.

## 3.7 Start services on EC2

From app directory:
- `docker compose up -d --build`

Check:
- `docker compose ps`
- `docker compose logs -f api`
- Health endpoint: `GET /api/health`

---

## 4) How API connects to Redis

Connection path in this template:
- API container reads `REDIS_URL` from `.env`
- Hostname `redis` points to Redis service inside Docker Compose network
- Port is `6379`

Use this value in `.env` on EC2:
- `REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379`

For local host testing (outside container), use:
- `redis://:${REDIS_PASSWORD}@localhost:6379`

---

## 5) Deploy model with current template

Current state:
- GitHub Actions builds/tests and publishes Docker image on `main`.
- EC2 deploy is still manual unless a dedicated deploy workflow is added.

Manual deployment update on EC2:
1. Pull latest code on server
2. Rebuild/restart:
   - `docker compose up -d --build`
3. Verify health endpoint

---

## 6) Production recommendations

1. Put Nginx/Caddy in front of API for TLS + reverse proxy.
2. Keep Redis port private (do not expose 6379 publicly in production).
3. Use managed Postgres/Redis when scaling.
4. Add monitoring/log shipping (CloudWatch, Grafana, etc.).
5. Keep immutable release notes and backup strategy.

---

## 7) Quick validation checklist

Before first production deploy:
- `npm run check` passes locally
- Workflows run green on `main`
- `.env` values set correctly on EC2
- Security Group restricted properly
- API health endpoint returns success

---

## 8) Redis stability and data-loss prevention

If you want Redis to survive deploys and reduce data-loss risk:

1. Keep the named volume (`redis_data`) and never run:
   - `docker compose down -v`
2. Keep AOF enabled and snapshots enabled (already configured in [docker-compose.yml](docker-compose.yml)).
3. Keep Redis port local-only on EC2 host (`127.0.0.1:6379`) to reduce attack surface.
4. Use EBS-backed storage for the EC2 instance and enable scheduled EBS snapshots.
5. During deploys, use:
   - `docker compose up -d --build`
   - Do not remove volumes.
6. Periodically verify Redis persistence files exist:
   - `docker compose exec redis ls -lah /data`

Optional extra safety before risky changes:
- Trigger manual Redis snapshot:
  - `docker compose exec redis redis-cli -a "$REDIS_PASSWORD" BGSAVE`
