# Deploy Workflow (Private GHCR + SSH) — Template Guide

This document defines a reproducible deployment flow for template users who clone/reset this repo and deploy to their own VM.

Supported targets in this guide:
- AWS EC2 (Ubuntu)
- GCP Compute Engine (Ubuntu)

Design goals:
- Keep container image private in GHCR
- Deploy over SSH from GitHub Actions
- Avoid storing app source on server for deploys
- Use immutable image tags (commit SHA) when auto-deploying

---

## 0) What is already included in this template

Included workflows/manifests:
- [ .github/workflows/backend-docker-publish.yml](../.github/workflows/backend-docker-publish.yml)
- [ .github/workflows/backend-deploy.yml](../.github/workflows/backend-deploy.yml)
- [docker-compose.deploy.yml](../docker-compose.deploy.yml)

Flow:
1. Push to `main`
2. Publish workflow builds/tests and pushes image to private GHCR
3. Deploy workflow triggers after publish success
4. Deploy workflow uploads deploy compose file and runs remote `docker compose`

---

## 1) Required GitHub repo secrets

Add these under GitHub repo → Settings → Secrets and variables → Actions:

Required:
- `EC2_HOST` — server public DNS/IP
- `EC2_USER` — SSH user (recommended `deploy`)
- `EC2_SSH_PRIVATE_KEY` — private SSH key content (multiline)
- `EC2_HOST_FINGERPRINT` — SSH host fingerprint (SHA256)
- `GHCR_USERNAME` — GH account/org name that owns package
- `GHCR_PAT` — PAT with `read:packages`

Optional:
- `EC2_PORT` — default `22`
- `DEPLOY_PATH` — default `/opt/apps/<repo-name>`

Notes:
- Secret names use `EC2_*` for compatibility even if your target is GCP VM.
- For GCP, still set `EC2_HOST` to GCP VM external IP/DNS.

---

## 2) Keep GHCR package private (must)

Your package should remain private.

Package path format:
- `ghcr.io/<owner>/<app-name>-backend`

Create a PAT:
1. GitHub → Settings → Developer settings → Personal access tokens
2. Create fine-grained token (recommended)
3. Grant package read permission
4. Save as `GHCR_PAT` secret

Server pull test command:

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
docker pull ghcr.io/<owner>/<app-name>-backend:latest
```

---

## 3) Server preparation (common)

Run these commands on your VM (AWS or GCP Ubuntu).

### 3.1 OS update

```bash
sudo apt-get update
sudo apt-get -y upgrade
```

### 3.2 Install Docker Engine + Compose plugin

```bash
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Verify:

```bash
docker --version
docker compose version
```

### 3.3 Create deploy user (recommended)

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo mkdir -p /home/deploy/.ssh
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
```

Create deploy directory:

```bash
sudo mkdir -p /opt/apps/<app-name>
sudo chown -R deploy:deploy /opt/apps/<app-name>
```

---

## 4) SSH key setup for GitHub Actions

Generate deploy key locally:

```bash
ssh-keygen -t ed25519 -C "gha-deploy" -f ./gha_deploy_key
```

Install public key on VM:

```bash
cat ./gha_deploy_key.pub
```

Append output to remote:

```bash
# run on server as deploy user
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Add private key to GitHub secret:
- Secret name: `EC2_SSH_PRIVATE_KEY`
- Value: contents of `./gha_deploy_key`

Get host fingerprint (local machine):

```bash
ssh-keyscan -t ed25519 <server-host-or-ip> | ssh-keygen -lf - -E sha256
```

Take the fingerprint value (example format `SHA256:...`) and save as:
- `EC2_HOST_FINGERPRINT`

---

## 5) Environment file on server

Create deployment env file at `<DEPLOY_PATH>/.env`:

```bash
cd /opt/apps/<app-name>
cp /path/to/repo/example.env .env
```

Set required production values:
- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_PASSWORD`
- `REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379`
- `PORT=3000`

Optional for host port mapping in deploy compose:
- `API_PORT=3000`

---

## 6) Cloud-specific networking differences

## AWS EC2

Security Group inbound rules:
- `22/tcp` from your admin IP (or CI egress IP range if fixed)
- `80/tcp` from `0.0.0.0/0`
- `443/tcp` from `0.0.0.0/0`
- Do not expose `6379`

Common SSH:

```bash
ssh -i <key.pem> deploy@<ec2-public-dns>
```

## GCP Compute Engine

VPC firewall rules equivalent:
- allow `tcp:22` from admin IP
- allow `tcp:80` and `tcp:443` as needed
- do not allow `tcp:6379`

If OS Login is enabled, user provisioning differs.
If using metadata-based SSH keys, add deploy key with `gcloud`:

```bash
gcloud compute project-info add-metadata \
  --metadata-from-file ssh-keys=./gcp_ssh_keys.txt
```

Or instance-level:

```bash
gcloud compute instances add-metadata <instance-name> \
  --zone <zone> \
  --metadata-from-file ssh-keys=./gcp_ssh_keys.txt
```

Common SSH:

```bash
gcloud compute ssh deploy@<instance-name> --zone <zone>
```

Template workflow still works exactly the same:
- set `EC2_HOST` to GCP VM external IP/DNS
- set `EC2_USER` to your SSH user

---

## 7) How auto-deploy works in this template

Deploy workflow trigger logic:
- Automatic: on successful completion of publish workflow on `main`
- Manual: Actions → "Backend Deploy (EC2)" → Run workflow

Remote deploy commands executed by workflow:

```bash
API_IMAGE="ghcr.io/<owner>/<app-name>-backend:<tag>"
echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
docker compose -f docker-compose.deploy.yml pull api
docker compose -f docker-compose.deploy.yml up -d --remove-orphans
docker compose -f docker-compose.deploy.yml ps
```

Tag behavior:
- Auto deploy uses `head_sha` from publish event
- Manual deploy uses `image_tag` input (default `latest`)

---

## 8) Manual deploy fallback

Use this when Actions is unavailable.

```bash
cd /opt/apps/<app-name>
export API_IMAGE="ghcr.io/<owner>/<app-name>-backend:<tag>"
echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
docker compose -f docker-compose.deploy.yml pull api
docker compose -f docker-compose.deploy.yml up -d --remove-orphans
docker compose -f docker-compose.deploy.yml logs -f api
```

Health check:

```bash
curl -fsS http://localhost:3000/api/health
```

---

## 9) Verification checklist

After first setup:
1. Push a commit to `main`
2. Confirm publish workflow succeeds
3. Confirm deploy workflow succeeds
4. Confirm containers are healthy
5. Confirm API health endpoint returns success

Remote checks:

```bash
docker compose -f docker-compose.deploy.yml ps
docker compose -f docker-compose.deploy.yml logs --tail=100 api
docker compose -f docker-compose.deploy.yml logs --tail=100 redis
```

---

## 10) Security hardening notes

- Keep GHCR package private
- Rotate `GHCR_PAT` periodically
- Restrict SSH inbound by source IP
- Use least privilege for PAT and VM users
- Do not store `.env` in git
- Keep Redis bound locally (`127.0.0.1:6379`) as configured
- Put reverse proxy (Nginx/Caddy) in front for TLS

---

## 11) Troubleshooting

### Authentication failed pulling image
- Recheck `GHCR_USERNAME` and `GHCR_PAT`
- Confirm PAT has package read access
- Confirm package owner matches image path

### SSH handshake/fingerprint failed
- Re-run fingerprint command
- Update `EC2_HOST_FINGERPRINT`
- Ensure host key did not rotate unexpectedly

### Compose says `.env` missing
- Create `<DEPLOY_PATH>/.env`
- Ensure `DEPLOY_PATH` secret matches actual server path

### API container starts then exits
- Check logs:

```bash
docker compose -f docker-compose.deploy.yml logs --tail=200 api
```

- Usually env/database/redis connectivity issue

---

## 12) Template user quick-start (copy/paste)

1. Clone template and run reset:

```bash
npm install
npm run reset --name my-app
git add .
git commit -m "chore: initialize from template"
git push -u origin main
```

2. Prepare VM (AWS EC2 or GCP Compute Engine) with Docker.
3. Configure SSH deploy key and host fingerprint.
4. Add GitHub secrets listed in section 1.
5. Create server `.env` in deploy path.
6. Push to `main` and verify both workflows pass.

This is the baseline reproducible path for template consumers.
