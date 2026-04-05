# Docker + Redis Setup

## Quick path

If you only want to start the app quickly:

```bash
cp example.env .env
docker compose up -d --build
curl http://localhost:3000/api/health
```

Stop:

```bash
docker compose down
```

---

## 1) Prepare env

```bash
cp example.env .env
```

Set your Neon values in `.env` (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`).

For local Redis with compose, keep:

```env
REDIS_PASSWORD=redis_dev_password
REDIS_URL=redis://:redis_dev_password@localhost:6379
```

## 2) Start backend + Redis

From `backend/`:

```bash
docker compose up -d --build
```

Services:
- API: http://localhost:3000
- Redis: localhost:6379

## 3) Stop

```bash
docker compose down
```

To also remove Redis persisted volume:

```bash
docker compose down -v
```

## Notes

- `docker-compose.yml` already wires `REDIS_URL` for the API container via the internal hostname `redis`.
- Current app does not yet consume Redis in code. This setup prepares infra for rate-limiter/caching/queue integration.
