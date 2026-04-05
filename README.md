# Backend Template Audit (April 4, 2026)

Production-oriented Node.js + TypeScript backend template using Express, Prisma, PostgreSQL (Neon-ready), JWT auth, RBAC scaffolding, Redis-backed rate limiting, Docker, and GitHub Actions.

---

## Documentation map (start here)

- Local Docker usage: [docs/DOCKER.md](docs/DOCKER.md)
- Server bootstrap (GitHub + EC2): [docs/server-setup.md](docs/server-setup.md)
- End-to-end deployment workflow (private GHCR + SSH, AWS/GCP differences): [docs/Deploy-workflow.md](docs/Deploy-workflow.md)
- Agent context pack: [.agent/README.md](.agent/README.md)

GitHub workflow files:
- CI checks: [ .github/workflows/backend-ci.yml](.github/workflows/backend-ci.yml)
- Docker publish to GHCR: [ .github/workflows/backend-docker-publish.yml](.github/workflows/backend-docker-publish.yml)
- Deploy to VM over SSH: [ .github/workflows/backend-deploy.yml](.github/workflows/backend-deploy.yml)

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
- Deploy Compose for prebuilt images
- In-process request, auth, rate-limit, and email observability hooks
- CI workflow (install, generate Prisma client, typecheck, build, Docker build validation)
- GHCR image publish workflow
- Automated VM deploy workflow over SSH

### Template utilities
- `npm run reset --name your-app-name` to reset template identity + git history

---

## API surface (current)

Base path: `/api`

### Health
- `GET /health`
- `GET /health/db`

### Auth
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/password/request-reset`
- `POST /auth/password/reset`
- `POST /auth/logout` (requires bearer access token)
- `POST /auth/password/change` (requires bearer access token)
- `GET /auth/profile` (requires bearer access token)

### Metrics
- `GET /metrics` (requires bearer access token with `ADMIN` role)

---

## Configuration steps

## 1) Prerequisites
- Node.js `24.x`
- npm `11.x`
- PostgreSQL connection string (Neon recommended)
- Redis (optional for local dev, recommended/required for production setup)

## 2) Install

```bash
npm ci
```

## 3) Configure environment

```bash
cp example.env .env
```

Set at minimum:
- `DATABASE_URL`
- `JWT_SECRET`

Recommended:
- `DIRECT_URL`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `REDIS_PASSWORD`
- `PORT`
- `NODE_ENV`

Production validation in this template requires:
- `DIRECT_URL`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`

## 4) Prisma setup

```bash
npm run prisma:generate
npm run prisma:push
```

## 5) Run locally

```bash
npm run dev
```

Server default: `http://localhost:3000`

## 6) Optional Docker run (API + Redis)

```bash
docker compose up -d --build
```

Health checks:
- `GET http://localhost:3000/api/health`
- `GET http://localhost:3000/api/health/db`

Stop:

```bash
docker compose down
```

---

## Scripts

- `npm run dev` — start watch mode via `tsx`
- `npm run build` — compile TypeScript
- `npm run start` — run built app
- `npm run check` — type check
- `npm run lint` — ESLint across the repository
- `npm run prisma:generate`
- `npm run prisma:push`
- `npm run prisma:migrate`
- `npm run prisma:studio`
- `npm run reset --name your-app-name`

---

## Project structure

```text
backend/
├── .agent/
│   ├── README.md
│   ├── context.json
│   ├── project-context.md
│   ├── operations-playbook.md
│   ├── api-surface.md
│   ├── change-impact-map.md
│   └── handoff-template.md
├── prisma/
│   └── schema.prisma
├── scripts/
│   └── reset-template.mjs
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── types/
│   ├── validators/
│   ├── app.ts
│   ├── index.ts
│   └── prisma.ts
├── .github/workflows/
├── docker-compose.yml
├── docker-compose.deploy.yml
├── Dockerfile
├── example.env
├── docs/
│   ├── DOCKER.md
│   ├── Deploy-workflow.md
│   └── server-setup.md
└── reset-template.config.json
```

---

## Operational notes

1. Access tokens are revoked via blacklist checks in the auth middleware; refresh tokens are revoked in `RefreshToken` and rotated on refresh.
2. Request metrics are in-process for now; if you run multiple API replicas, ship the snapshot to Prometheus/OpenTelemetry before relying on it for alerting.
3. Production validation still requires `DIRECT_URL`, `JWT_REFRESH_SECRET`, `REDIS_URL`, and `CORS_ORIGIN`.

---

## License

ISC
# Node.js + Neon DB + Prisma Enterprise Backend

Production-ready REST API with enterprise-grade JWT Authentication, Prisma ORM, and comprehensive security features for modern applications.

## 🚀 Features

### 🔐 Enterprise-Grade Authentication
- **JWT Access & Refresh Tokens**: Short-lived access tokens (15min) with long-lived refresh tokens (7 days)
- **Token Rotation**: Automatic refresh token rotation on every refresh for enhanced security
- **Strong Password Policy**: Enforced minimum 8 characters with uppercase, lowercase, numbers, and special characters
- **Secure Password Hashing**: Bcrypt with 12 salt rounds (industry standard)
- **Account Lockout Protection**: Automatic account lock after 5 failed login attempts (30-minute cooldown)
- **Token Blacklist**: Revoked tokens tracked to prevent reuse after logout
- **Password Reset Flow**: Secure token-based password reset with expiration
- **Email Verification**: Structure ready for email verification implementation

### 🛡️ Security & Performance
- **Rate Limiting**: API-wide and auth-specific rate limits to prevent abuse
- **Helmet Security**: Essential HTTP security headers (XSS, MIME sniffing, etc.)
- **CORS Protection**: Configurable cross-origin resource sharing
- **Input Validation**: Zod schema validation for all requests
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **Error Handling**: Centralized error handling with safe error messages

### 🏗️ Architecture & Database
- **Prisma ORM**: Type-safe database queries with PostgreSQL
- **Neon DB**: Serverless Postgres with instant connection pooling
- **TypeScript**: Full type safety across the stack
- **Layered Architecture**: Controller → Service → Repository pattern
- **Graceful Shutdown**: Clean server and DB connection cleanup

## 📋 Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Neon DB Account** ([Sign up free](https://neon.tech/))
- **Git** (optional, for version control)

## 🛠️ Installation

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd petition-app/backend
npm install
```

### 2. Create Neon DB Project

1. Go to [Neon Console](https://console.neon.tech/)
2. Click **"New Project"**
3. Fill in project details:
   - Project name (e.g., "petition-app")
   - Postgres version (latest recommended)
   - Region (choose closest to your users)
4. Click **"Create Project"**

### 3. Configure Environment Variables

Copy the example env file:

```bash
cp example.env .env
```

Now fill in each variable:

#### **DATABASE_URL**

1. In Neon Console, go to your project dashboard
2. Click on **"Connection Details"**
3. Select **"Pooled connection"** (recommended for serverless)
4. Copy the connection string

It should look like:
```
postgresql://neondb_owner:AbCdEf123456@ep-cool-name-123456.region.aws.neon.tech/neondb?sslmode=require
```

Paste into `.env`:
```env
DATABASE_URL=postgresql://neondb_owner:your-password@ep-your-endpoint.region.aws.neon.tech/neondb?sslmode=require
```

#### **JWT_SECRET**

Generate a secure random string for signing JWT tokens:

```bash
# On macOS/Linux
openssl rand -base64 32

# Or use any random string generator
```

Paste into `.env`:
```env
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production
```

⚠️ **Important**: Never commit your `.env` file or share your JWT secret!

#### **PORT** (optional)
- Server port (default: `3000`)

Example `.env` file:
```env
DATABASE_URL=postgresql://neondb_owner:AbCdEf123456@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-generated-secret-key-here-make-it-long-and-random
PORT=3000
```

### 4. Initialize Database

Generate Prisma client and push schema to Neon DB:

```bash
npm run prisma:generate
npm run prisma:push
```

This creates the `User` table in your Neon database.

#### ⚠️ Troubleshooting Neon Connection Issues

If you encounter `Can't reach database server` or `P1001` errors when running Prisma commands:

**Problem:** Prisma's migration engine doesn't support the `channel_binding=require` parameter that Neon provides by default.

**Solution:** Configure your connection strings in `.env` as follows:

1. **Use the POOLED connection** (with `-pooler` in hostname) for both URLs
2. **Remove `channel_binding=require`** from the connection string
3. **Add query parameters** for optimal performance:
   - `pgbouncer=true` to `DATABASE_URL`
   - `connect_timeout=15` to both URLs (allows time for Neon cold starts)

```env
# ✅ Correct format
DATABASE_URL="postgresql://user:pass@ep-project-pooler.region.aws.neon.tech/db?sslmode=require&pgbouncer=true&connect_timeout=15"
DIRECT_URL="postgresql://user:pass@ep-project-pooler.region.aws.neon.tech/db?sslmode=require&connect_timeout=15"
```

**Why this works:**
- Neon's direct (non-pooled) endpoint may not be accessible from all networks
- The pooled connection works for both runtime queries and migrations
- Prisma 5.10+ supports using pooled connections for migrations via `directUrl`

After updating `.env`, run `npm run prisma:push` again - it should work!

### 5. Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000` 🎉

## 📁 Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema (tables, relations)
├── src/
│   ├── config/
│   │   ├── env.ts             # Environment validation with Zod
│   │   └── jwt.ts             # JWT token generation & verification
│   ├── controllers/
│   │   └── auth.controller.ts # Request handlers (HTTP layer)
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT authentication
│   │   ├── error.middleware.ts      # Centralized error handling
│   │   ├── rateLimiter.middleware.ts # Rate limiting config
│   │   └── validate.middleware.ts   # Zod schema validation
│   ├── routes/
│   │   ├── auth.routes.ts     # Auth endpoints
│   │   ├── health.routes.ts   # Health check endpoints
│   │   └── index.ts           # Route aggregator
│   ├── services/
│   │   └── auth.service.ts    # Business logic layer
│   ├── types/
│   │   └── index.ts           # Custom types & error classes
│   ├── validators/
│   │   └── auth.validator.ts  # Zod schemas for validation
│   ├── app.ts                 # Express app setup
│   ├── index.ts               # Server entry point
│   └── prisma.ts              # Prisma client instance
├── .env                       # Environment variables (git-ignored)
├── .gitignore                 # Files to ignore in git
├── example.env                # Environment template
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

### Architecture Layers

1. **Routes** → Define endpoints and attach middleware
2. **Middleware** → Validation, authentication, rate limiting
3. **Controllers** → Handle HTTP requests/responses
4. **Services** → Business logic and orchestration
5. **Prisma** → Database operations
6. **Config** → Centralized configuration and utilities

## 🔌 API Endpoints

Base URL: `http://localhost:3000/api`

### Health Checks

#### `GET /api/health`
Check if the API is running.

**Response:**
```json
{
  "success": true,
  "data": { "status": "ok" }
}
```

#### `GET /api/health/db`
Check database connectivity.

**Response:**
```json
{
  "success": true,
  "data": { "status": "ok", "db": "up" }
}
```

### Authentication

#### `POST /api/auth/signup`
Create a new user account.

**Rate Limit:** 5 requests per 15 minutes

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```

**Validation:**
- Email must be valid
- Password must be at least 8 characters
- Password must contain: uppercase, lowercase, number, and special character

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "emailVerified": false,
      "createdAt": "2026-01-28T10:00:00.000Z"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### `POST /api/auth/login`
Authenticate existing user.

**Rate Limit:** 10 requests per 15 minutes

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "emailVerified": false
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Account Lockout:**
- Account locks after 5 failed login attempts
- Lockout duration: 30 minutes
- Response (423): `"Account locked due to too many failed login attempts. Try again in X minutes."`

#### `POST /api/auth/refresh`
Refresh access token using refresh token.

**Rate Limit:** 20 requests per 15 minutes

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Note:** Old refresh token is automatically invalidated (token rotation).

#### `POST /api/auth/logout`
Logout and invalidate refresh token.

**Rate Limit:** 20 requests per 15 minutes

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

#### `POST /api/auth/forgot-password`
Request password reset token.

**Rate Limit:** 3 requests per 15 minutes

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset instructions sent to email",
    "resetToken": "temp-token-for-testing"
  }
}
```

**Note:** In production, token should be sent via email only.

#### `POST /api/auth/reset-password`
Reset password using reset token.

**Rate Limit:** 5 requests per 15 minutes

**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecureP@ss123"
}
```

**Validation:**
- New password must meet strong password requirements
- Token must be valid and not expired (1 hour expiry)

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Password reset successful" }
}
```

#### `GET /api/auth/me`
Get current authenticated user profile (protected route).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "emailVerified": false,
      "createdAt": "2026-01-28T10:00:00.000Z"
    }
  }
}
```

## 🔒 Security Features

### Token Management
- **Access Tokens**: Short-lived (15 minutes) for API requests
- **Refresh Tokens**: Long-lived (7 days) for obtaining new access tokens
- **Token Rotation**: New refresh token issued on every refresh, old one invalidated
- **Token Blacklist**: Revoked tokens tracked in database to prevent reuse

### Password Security
- **Bcrypt Hashing**: 12 salt rounds (industry standard)
- **Strong Password Policy**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&#)

### Account Protection
- **Login Attempt Tracking**: Failed attempts recorded per user
- **Automatic Lockout**: Account locks after 5 failed attempts
- **Timed Unlocking**: Accounts auto-unlock after 30 minutes
- **Password Reset**: Secure token-based reset with 1-hour expiration

### Rate Limiting
- **Global**: 100 requests per 15 minutes per IP
- **Auth Endpoints**:
  - Signup: 5 requests per 15 minutes
  - Login: 10 requests per 15 minutes
  - Refresh: 20 requests per 15 minutes
  - Logout: 20 requests per 15 minutes
  - Forgot Password: 3 requests per 15 minutes
  - Reset Password: 5 requests per 15 minutes

## 🧪 Testing the API

### Using cURL
      "email": "user@example.com",
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the `token`** for authenticated requests!

#### `GET /api/auth/profile`
Get user profile (protected route).

**Authorization:** Bearer token required

## 🧪 Testing the API

### Using cURL

#### 1. Create Account
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecureP@ss123"}'
```

Save the `accessToken` and `refreshToken` from the response.

#### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecureP@ss123"}'
```

#### 3. Get Profile (Protected Route)
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 4. Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

#### 5. Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

#### 6. Password Reset Flow
```bash
# Request reset token
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Reset password with token
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"RESET_TOKEN","newPassword":"NewSecureP@ss456"}'
```

#### 7. Health Checks
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/db
```

### Using Postman/Thunder Client

1. **Import endpoints** from the curl examples above
2. **Create environment variables**:
   - `baseUrl`: `http://localhost:3000/api`
   - `accessToken`: (set after login)
   - `refreshToken`: (set after login)
3. **Use Bearer Token** auth type for protected routes

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm start` | Start production server |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run check` | Type-check without building |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:push` | Sync schema to database (dev) |
| `npm run prisma:pull` | Pull schema from database |
| `npm run prisma:migrate` | Create migration files (production) |
| `npm run prisma:studio` | Open Prisma Studio GUI (localhost:5555) |

## 🗄️ Database Management

### Adding a New Table

1. Edit `prisma/schema.prisma`:

```prisma
model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  authorId  String
  author    Profile  @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}
```

2. Update Profile model to include relation:

```prisma
model Profile {
  id        String   @id @default(uuid())
  email     String   @unique
  posts     Post[]   // Add this
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

3. Push to database:

```bash
npm run prisma:generate
npm run prisma:push
```

### Using Prisma in Code

```typescript
import { prisma } from './prisma.js';

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
