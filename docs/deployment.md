# Deployment

## Local

`docker compose up -d postgres redis` then `npm run dev`

## Full stack

`docker compose up --build`

## Production readiness

- Managed PostgreSQL / Redis compatible
- Secrets via environment / secret manager
- Horizontally scalable API and worker
- Prisma migrate deploy on release
- Health endpoints: `/api/v1/health/live`, `/ready`, `/providers`
