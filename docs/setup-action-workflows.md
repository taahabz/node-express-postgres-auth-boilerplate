# Setup Action Workflows for EC2 Production Deploy

This guide covers the full production path for this backend template:

1. prepare an EC2 host
2. add the GitHub secrets
3. keep Prisma migrations and the database schema in sync
4. deploy with a single GitHub Actions workflow
5. verify the app health after deploy

The workflow file used by this guide is [`.github/workflows/backend-deploy.yml`](../.github/workflows/backend-deploy.yml).

---

## 1) What this workflow does

On every push to `main`, or when you run it manually from GitHub Actions, the workflow will:

1. check that the required secrets exist
2. install Node.js dependencies
3. generate the Prisma client
4. run lint
5. run type checks
6. build the app
7. validate the Docker build
8. upload the app source to EC2
9. build a temporary Docker builder image on EC2
10. run Prisma migration sync from that builder image
11. run `prisma db push` from that builder image to keep the live schema aligned
12. build and restart the containers
13. check the health endpoint

This is the single-file production workflow for this template.

---

## 2) Before you start

You need:

- a GitHub repository for this backend
- an EC2 instance running Ubuntu
- a public SSH key for the deploy user
- Docker Engine and Docker Compose installed on the EC2 instance
- a production `.env` file on the server
- a working PostgreSQL database
- a Redis instance or Redis container on the server

Recommended EC2 baseline:

- Ubuntu 22.04 LTS
- `t3.small` or larger
- at least `20 GB` of disk
- inbound `22` only from your IP
- inbound `80` and `443` if you plan to add a reverse proxy

---

## 3) Set up EC2 step by step

### Step 3.1: Launch the instance

1. Open the AWS EC2 console.
2. Click **Launch instance**.
3. Choose **Ubuntu 22.04 LTS**.
4. Pick a machine size, such as `t3.small`.
5. Create or select a key pair for SSH access.
6. Attach a security group.
7. Add storage, ideally `20 GB` or more.
8. Launch the instance.

### Step 3.2: Open the right security group ports

Use these inbound rules:

- `22/tcp` from your current IP
- `80/tcp` from the public internet if you will use a reverse proxy
- `443/tcp` from the public internet if you will use TLS
- do **not** open `6379/tcp` to the public internet
- do **not** expose `3000/tcp` publicly in production unless you deliberately want direct access

### Step 3.3: SSH into the server

From your local machine:

```bash
ssh -i /path/to/key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

If your user is not `ubuntu`, replace it with the username you created.

### Step 3.4: Update the server

Run:

```bash
sudo apt-get update
sudo apt-get -y upgrade
```

This keeps the server current before installing Docker.

### Step 3.5: Install Docker Engine and Compose plugin

Run:

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

### Step 3.6: Create a deploy user

Create a dedicated deploy user instead of deploying as root:

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo mkdir -p /home/deploy/.ssh
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
```

Then create the application folder:

```bash
sudo mkdir -p /opt/apps/skillbridge-backend
sudo chown -R deploy:deploy /opt/apps/skillbridge-backend
```

If your app name is different, use that name instead of `skillbridge-backend`.

---

## 4) Create the SSH key pair for GitHub Actions

The deploy workflow uses an SSH private key stored in GitHub secrets.

### Step 4.1: Generate the key locally

On your local machine:

```bash
ssh-keygen -t ed25519 -C "gha-deploy" -f ./gha_deploy_key
```

This creates:

- `./gha_deploy_key` — private key
- `./gha_deploy_key.pub` — public key

### Step 4.2: Add the public key to the EC2 server

Copy the public key:

```bash
cat ./gha_deploy_key.pub
```

Then on the EC2 server, as the deploy user:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Paste the public key into `authorized_keys` and save the file.

### Step 4.3: Save the private key in GitHub

Create this GitHub secret:

- `DEPLOY_SSH_KEY` = the full contents of `./gha_deploy_key`

### Step 4.4: Capture the server host fingerprint

Run this from your local machine:

```bash
ssh-keyscan -t ed25519 YOUR_EC2_PUBLIC_IP | ssh-keygen -lf - -E sha256
```

Copy the SHA256 fingerprint value and save it as:

- `DEPLOY_HOST_FINGERPRINT`

This protects you from connecting to the wrong host.

---

## 5) Create the GitHub secrets

Add these under **GitHub repo → Settings → Secrets and variables → Actions**.

### Required secrets

- `DEPLOY_HOST` — public IP or DNS name of the EC2 server
- `DEPLOY_USER` — SSH username, usually `deploy` or `ubuntu`
- `DEPLOY_SSH_KEY` — private key content from step 4
- `DEPLOY_HOST_FINGERPRINT` — SHA256 host fingerprint from step 4

### Optional secrets

- `DEPLOY_PORT` — defaults to `22`
- `DEPLOY_PATH` — defaults to `/opt/apps/<repo-name>`

### What each secret is for

- `DEPLOY_HOST` tells Actions which server to connect to
- `DEPLOY_USER` tells Actions which Linux user to SSH as
- `DEPLOY_SSH_KEY` authenticates the workflow with the server
- `DEPLOY_HOST_FINGERPRINT` makes the SSH connection strict and safer
- `DEPLOY_PORT` lets you move SSH off port `22` if needed
- `DEPLOY_PATH` controls where the repo is deployed on the server

---

## 6) Prepare the production `.env` on EC2

The workflow expects a server-side `.env` file to already exist.

### Step 6.1: Create the file

On the EC2 server:

```bash
cd /opt/apps/skillbridge-backend
cp /path/to/repo/example.env .env
```

If the folder is empty, create it first:

```bash
mkdir -p /opt/apps/skillbridge-backend
cd /opt/apps/skillbridge-backend
cp /path/to/repo/example.env .env
```

### Step 6.2: Fill the required values

At minimum, production needs:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `CORS_ORIGIN`

If you use email delivery, also set the provider variables from `example.env`.

### Step 6.3: Keep secrets out of Git

Do not commit the EC2 `.env` file.

The workflow only checks that the file exists and that the critical keys are present.

---

## 7) Keep Prisma migrations and the database in sync

This template uses committed Prisma migrations.

### Local development rule

When you change the schema:

1. edit [`prisma/schema.prisma`](../prisma/schema.prisma)
2. run the migration command locally
3. commit the generated migration folder in `prisma/migrations/`
4. run Prisma generate
5. push the code and migrations together

Suggested local commands:

```bash
npm run prisma:migrate
npm run prisma:generate
```

### Production sync rule

On EC2, the workflow does both of these from a temporary builder image that has the Prisma CLI available:

1. `npx prisma migrate deploy`
2. `npx prisma db push`

That keeps the live database aligned with the committed migration files and the schema file in the repository.

If you later want a stricter migration-only production path, remove `db push` from the workflow and keep only `migrate deploy`.

---

## 8) What happens during deploy

The unified workflow runs in this order:

1. Validate secrets
2. Install dependencies
3. Generate Prisma client
4. Lint
5. Type check
6. Build the app
7. Validate the Docker build
8. Upload source to EC2
9. Verify server `.env`
10. Run `prisma migrate deploy`
11. Run `prisma db push`
12. Build and restart the containers
13. Check the health endpoint

The workflow file for this is [`.github/workflows/backend-deploy.yml`](../.github/workflows/backend-deploy.yml).

---

## 9) First deploy checklist

Before your first production deploy, confirm:

- the GitHub secrets are saved correctly
- the EC2 host has Docker and Compose installed
- the deploy user can run Docker commands
- the EC2 `.env` file exists
- the app can connect to PostgreSQL
- the app can connect to Redis
- migrations are committed to the repo
- `main` is the branch you are deploying from

Then push to `main` or run the workflow manually.

---

## 10) How to verify the server after deploy

After the workflow completes:

```bash
curl -fsS http://localhost:3000/api/health
```

If you want a deeper check, also run:

```bash
docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=100 redis
```

---

## 11) Common problems

### Missing secret error

If the workflow says a secret is missing:

1. Open GitHub → Settings → Secrets and variables → Actions
2. Check the secret name exactly
3. Make sure there are no extra spaces in the value
4. Save again and rerun the workflow

### SSH fingerprint error

If SSH verification fails:

1. re-run the `ssh-keyscan` command
2. make sure the EC2 public IP is correct
3. update `DEPLOY_HOST_FINGERPRINT`
4. rerun the workflow

### `.env` missing on EC2

If the workflow fails because `.env` is missing:

1. SSH into EC2
2. create the file in `DEPLOY_PATH`
3. fill the required variables
4. rerun the workflow

### Migration step fails

If `prisma migrate deploy` fails:

1. check whether your migration files are committed
2. confirm `DIRECT_URL` is valid
3. confirm the database already exists and is reachable
4. check the migration output in the workflow logs

### Health check fails

If the app deploys but health check fails:

1. inspect `docker compose logs --tail=100 api`
2. confirm Redis and PostgreSQL are reachable
3. confirm `CORS_ORIGIN` is set
4. confirm JWT and email env values are present

---

## 12) Recommended next step after this guide

After the first successful deploy:

1. keep the same workflow file
2. commit schema changes together with migration files
3. use the workflow as your production deploy path
4. remove any old manual deploy notes you no longer need

This keeps the app, migrations, and production database aligned.
