# EC2 deploy guide (simple)

This project deploys with one workflow:

- [`.github/workflows/backend-deploy.yml`](../.github/workflows/backend-deploy.yml)

That workflow runs checks, syncs Prisma, deploys containers, and checks health.

---

## 1) Required GitHub secrets

Add these in GitHub repo settings → Secrets and variables → Actions:

- `DEPLOY_HOST` (EC2 public IP or DNS)
- `DEPLOY_USER` (usually `deploy` or `ubuntu`)
- `DEPLOY_SSH_KEY` (your EC2 private key content, including BEGIN/END lines)

Optional:

- `DEPLOY_PORT` (default `22`)
- `DEPLOY_PATH` (default `/opt/apps/<repo-name>`)

No host fingerprint is required.

---

## 2) EC2 server setup (one-time)

### 2.1 Launch EC2

- Ubuntu 22.04 LTS
- At least `t3.small`
- At least `20 GB` disk

### 2.2 Security group

- allow `22/tcp` from your IP
- allow `80/tcp` and `443/tcp` if needed
- do not expose `6379`

### 2.3 Install Docker + Compose

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

### 2.4 Create deploy user

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo mkdir -p /home/deploy/.ssh
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
```

### 2.5 Add your SSH public key

As `deploy` user:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Paste the public key that matches your `DEPLOY_SSH_KEY`.

### 2.6 Create deploy folder + env file

```bash
sudo mkdir -p /opt/apps/skillbridge-backend
sudo chown -R deploy:deploy /opt/apps/skillbridge-backend
cd /opt/apps/skillbridge-backend
cp /path/to/repo/example.env .env
```

Set required `.env` values:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `CORS_ORIGIN`

---

## 3) Keep DB and migrations in sync

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

In production deploy, workflow runs:

- `npm run prisma:migrate:deploy`
- `npm run prisma:push`

---

## 4) Deploy

Push to `main`.

That’s it.

The workflow will:

1. Validate secrets
2. Lint + typecheck + build
3. Upload source to EC2
4. Run Prisma sync on EC2
5. Restart containers
6. Check `/api/health`

---

## 5) Verify quickly

On EC2:

```bash
docker compose ps
docker compose logs --tail=100 api
curl -fsS http://localhost:3000/api/health
```

---

## 6) If deploy fails

- Check GitHub Actions logs first
- Confirm secrets are correct
- Confirm `.env` exists in deploy path
- Confirm DB/Redis connectivity
