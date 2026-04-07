# EC2 deploy guide (detailed flow)

This project uses one workflow: [../.github/workflows/backend-deploy.yml](../.github/workflows/backend-deploy.yml).

The workflow runs in 2 jobs:
1. `test` → lint, typecheck, app build, Docker build validation.
2. `push` → upload source, write `.env` from secret, run Prisma migrate deploy, deploy containers, health check, and auto-rollback if deploy fails.

---

## 1) One-time EC2 setup

### 1.1 Launch instance
- Ubuntu 22.04 LTS
- At least `t3.small`
- At least `20 GB` disk

### 1.2 Security group rules
- Allow `22/tcp` from your IP only
- Allow `80/tcp` and `443/tcp` as needed
- Do **not** expose Redis (`6379`)

### 1.3 Install Docker + Compose plugin

```bash
sudo apt-get update
sudo apt-get -y upgrade
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 1.4 Use existing EC2 `.pem` key (default)

Use the same `.pem` key you already use to SSH into EC2.

Set in GitHub Actions secrets:
- `DEPLOY_SSH_KEY` = full content of your `.pem` file
- `DEPLOY_USER` = `ubuntu` (or your current SSH user)

In this default flow, you do **not** need to derive a public key.

### 1.5 Create deploy directory

```bash
sudo mkdir -p /opt/apps/<repo-name>
sudo chown -R ubuntu:ubuntu /opt/apps/<repo-name>
```

If you use a different `DEPLOY_USER`, replace `ubuntu:ubuntu` with that user.
If you use custom `DEPLOY_PATH`, create and own that path instead.

---

## 2) Configure GitHub Actions secrets

Open: GitHub repo → Settings → Secrets and variables → Actions.

### Required secrets
- `DEPLOY_HOST`: EC2 public IP or DNS
- `DEPLOY_SSH_KEY`: full private key content (including BEGIN/END lines)
- `ENV_FILE`: full production `.env` content (multiline)

How to get values:
- `DEPLOY_SSH_KEY`: open your EC2 `.pem` file and paste full file content
- `ENV_FILE`: paste full production `.env` content (all lines)

### Optional secrets
- `DEPLOY_USER`: SSH user (default `ubuntu`)
- `DEPLOY_PORT`: SSH port (default `22`)
- `DEPLOY_PATH`: app path on EC2 (default `/opt/apps/<repo-name>`)

No host fingerprint secret is required in this setup.

---

## 3) Build the `ENV_FILE` secret correctly

`ENV_FILE` is written to `<DEPLOY_PATH>/.env` on **every** deploy.

At minimum include:
- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `CORS_ORIGIN`

You can include all other production values too (mail provider keys, frontend URLs, etc.).

Important:
- Keep one `KEY=value` per line.
- Do not wrap the whole file in quotes.
- Use real production values; do not paste `example.env` placeholders.

---

## 4) Keep Prisma migrations in sync

When schema changes locally:

1. Edit [../prisma/schema.prisma](../prisma/schema.prisma)
2. Run:

```bash
npm run prisma:migrate
npm run prisma:generate
```

3. Commit both:
   - `prisma/schema.prisma`
   - `prisma/migrations/**`

Production deploy runs:
- `npm run prisma:migrate:status`
- `npm run prisma:migrate:deploy`

So staging/prod stay aligned with committed migration files.

---

## 5) Deploy flow (what happens on every push to `main`)

1. `test` job runs checks and build.
2. If `test` passes, `push` job starts.
3. Source is uploaded to `<DEPLOY_PATH>/.incoming`.
4. Current deployed files are snapshotted to `<DEPLOY_PATH>/.rollback/previous`.
5. Uploaded files replace current files.
6. `.env` is written from `ENV_FILE` secret.
7. Prisma migration status + deploy run in containerized builder.
8. `docker compose up -d --build --remove-orphans` runs.
9. Health check runs at `http://localhost:3000/api/health`.

### Automatic rollback behavior
If deploy or health check fails:
- Workflow restores snapshot from `.rollback/previous`
- Rebuilds and starts previous version
- Re-checks health
- Job still exits failed so you can investigate

---

## 6) Post-deploy verification

On EC2, run:

```bash
cd /opt/apps/<repo-name>
docker compose ps
docker compose logs --tail=100 api
curl -fsS http://localhost:3000/api/health
```

If you use custom `DEPLOY_PATH`, change directory accordingly.

---

## 7) Troubleshooting checklist

1. Check GitHub Actions logs for failed step.
2. Confirm all required secrets exist and are non-empty.
3. Confirm `DEPLOY_USER` can SSH and run Docker (`docker ps` without sudo).
4. Confirm `ENV_FILE` contains required variables.
5. Confirm DB and Redis endpoints are reachable from EC2.
6. If rollback also fails, inspect:
   - `<DEPLOY_PATH>/.rollback/previous`
   - `docker compose logs --tail=200 api`
