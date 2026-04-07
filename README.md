# Backend Template

Production-oriented Node.js + TypeScript backend template using Express, Prisma, PostgreSQL (Neon-ready), JWT auth, RBAC scaffolding, Redis-backed rate limiting, Docker, and GitHub Actions.

---

## Quick start (first 15 minutes)

### 1) Initialize from template

```bash
npm install
npm run reset --name your-app-name
```

### 2) Create first commit and connect new GitHub repo

```bash
git add .
git commit -m "chore: initialize from template"
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

### 3) Configure local environment

```bash
cp example.env .env
```

Set at minimum:
- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `CORS_ORIGIN`

### 4) Run locally

```bash
npm run prisma:migrate
npm run prisma:generate
npm run dev
```

Health checks:
- `GET http://localhost:3000/api/health`
- `GET http://localhost:3000/api/health/db`

### 5) Setup production deploy

Follow [docs/setup-action-workflows.md](docs/setup-action-workflows.md).

That guide is part of the startup flow and includes:
- EC2 setup
- required GitHub secrets (`DEPLOY_HOST`, `DEPLOY_SSH_KEY`, `ENV_FILE`)
- deploy + auto rollback behavior

### 6) Deploy

Push to `main`. Workflow: [.github/workflows/backend-deploy.yml](.github/workflows/backend-deploy.yml)

---

## Docs

- Local Docker: [docs/DOCKER.md](docs/DOCKER.md)
- EC2 production workflow: [docs/setup-action-workflows.md](docs/setup-action-workflows.md)
- Agent context: [.agent/README.md](.agent/README.md)

GitHub workflow files:
- Unified production workflow: [ .github/workflows/backend-deploy.yml](.github/workflows/backend-deploy.yml)

---

## What this template includes (verified)

### Core stack
- Node.js 24 (see `engines` in package manifest)
- TypeScript + ESM
- Express 5
- Prisma ORM with PostgreSQL datasource
- Zod request/environment validation

### Security and auth
- JWT access tokens (`15m`) and refresh tokens (`30d`)
- Refresh token rotation on `POST /api/auth/refresh`
- Password hashing with `bcryptjs` (`12` rounds)
- Strong password policy (minimum `12` chars + lower/upper/number/special)
- Account lockout after `5` failed logins (`30` minutes)
- Access-token blacklist for logout plus refresh-token revocation in `RefreshToken`
- Global API rate limit (`100` requests / `15` minutes)
- Auth route limiter (`5` requests / `15` minutes on protected auth endpoints configured with `authLimiter`)
- Helmet + CORS + centralized error handling
- Request metrics endpoint at `GET /api/metrics` for admin users

### RBAC foundation
- `Role`, `Permission`, `UserRole`, `RolePermission` models
- Bootstrapped system roles: `USER`, `MODERATOR`, `ADMIN`
- Default role assignment at signup
- Authorization middleware helpers: `authorize()`, `requireRoles()`, `requirePermissions()`

### Infra/devops
- Multi-stage Dockerfile (deps → build → runtime)
- Docker Compose for API + Redis
## Architecture (simple)

Request flow:
1. `routes`
2. `controllers`
3. `services`
4. Prisma/database

Main directories:
- `src/routes`
- `src/controllers`
- `src/services`
- `src/middleware`
- `src/validators`
- `prisma`

---

## Scripts

- `npm run dev` — local dev server
- `npm run build` — compile TypeScript
- `npm run check` — type-check
- `npm run lint` — lint
- `npm run test` — run tests
- `npm run prisma:migrate` — create/apply dev migrations
- `npm run prisma:migrate:deploy` — apply committed migrations (deploy)
- `npm run prisma:generate` — generate Prisma client
- `npm run reset --name your-app-name` — template reset

---

## API surface

Base path: `/api`

- `GET /health`
- `GET /health/db`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/password/request-reset`
- `POST /auth/password/reset`
- `POST /auth/logout`
- `POST /auth/password/change`
- `GET /auth/profile`
- `GET /metrics` (admin)

---

## Docs

- Deploy setup: [docs/setup-action-workflows.md](docs/setup-action-workflows.md)
- Local Docker: [docs/DOCKER.md](docs/DOCKER.md)
- Agent context: [.agent/README.md](.agent/README.md)
// Create
const post = await prisma.post.create({
  data: {
    title: 'My Post',
    content: 'Hello world',
    authorId: 'user-id'
  }
});

// Read
const posts = await prisma.post.findMany({
  include: { author: true }
});

// Update
await prisma.post.update({
  where: { id: 'post-id' },
  data: { title: 'Updated Title' }
});

// Delete
await prisma.post.delete({ where: { id: 'post-id' } });
```

## 🔒 Security Features

## 🛡️ Security Best Practices

### Token Management
- **Access tokens** expire after 15 minutes - never store long-term
- **Refresh tokens** expire after 7 days and should be stored securely
- Tokens are automatically rotated on refresh for enhanced security
- Blacklisted tokens are stored in database and checked on every request

### Password Security  
- **Never** log or expose passwords
- Passwords hashed with bcrypt (12 rounds)
- Strong password policy enforced (8+ chars, upper, lower, number, special)
- Password reset tokens expire after 1 hour

### Rate Limiting
- **Authentication endpoints** heavily rate-limited to prevent brute force attacks
- **Account lockout** after 5 failed login attempts
- **Locked accounts** auto-unlock after 30 minutes

### HTTP Security Headers (via Helmet)
- XSS Protection
- Content Security Policy
- MIME sniffing prevention
- Referrer Policy
- Frame Options (prevent clickjacking)

### Environment Variables
- **Never commit** `.env` file to git
- Use different JWT secrets for development/production
- Rotate secrets regularly in production
- Use strong, random secrets (min 32 characters)

### Additional Recommendations
- **HTTPS only** in production (use reverse proxy like nginx)
- **CORS**: Whitelist specific origins in production
- **Database**: Use connection pooling for performance
- **Monitoring**: Log failed login attempts and suspicious activity
- **Backups**: Regular database backups with Neon's automated snapshots

## 🚨 Error Handling

All errors return consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }  // Only in development
}
```

**Error Status Codes:**
- `400` - Bad Request (validation failed)
- `401` - Unauthorized (authentication required/failed)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `423` - Locked (account locked due to failed attempts)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

**Common Error Messages:**
- `"Invalid email or password"` - Login failed
- `"Account locked due to too many failed login attempts"` - Brute force protection
- `"Token expired or invalid"` - Refresh token needed
- `"User already exists"` - Duplicate email on signup
- `"Too many requests, please try again later"` - Rate limit hit

## 🔧 Troubleshooting

### Database Connection Issues

**Error:** `Can't reach database server`

**Solutions:**
1. Verify `DATABASE_URL` is correct (check for typos)
2. URL-encode special characters in password (`@` → `%40`)
3. Ensure Supabase project isn't paused
4. Check network allows outbound port 5432
5. Use the pooler host (`*.pooler.supabase.com`) not direct host if IPv4-only

### Prisma Client Not Generated

**Error:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
npm run prisma:generate
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use`

**Solution:**
Change `PORT` in `.env` or kill the process using port 3000.

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | No | Environment mode | `development` or `production` |
| `PORT` | No | Server port | `3000` |
| `SUPABASE_URL` | Yes | Supabase project URL | `https://abc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (secret) | `eyJhbGc...` |
| `DATABASE_URL` | Yes | Pooled connection string | `postgresql://prisma...` |
| `DIRECT_URL` | Yes | Direct connection for migrations | `postgresql://prisma...` |

## 📚 Learn More

- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📄 License

ISC

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

Built with ❤️ using Node.js, TypeScript, Supabase, and Prisma
