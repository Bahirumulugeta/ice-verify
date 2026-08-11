# ICE Verification

Provider-agnostic payment verification platform. Merchants submit payment details; ICE verifies them through authorized provider integrations and a deterministic Demo provider.

ICE is **not** a bank, wallet, payment processor, or gateway.

## Product surfaces

- **Public website** — landing, verify, demo, docs, pricing, security
- **Developer platform** — dashboard, API keys, webhooks, playground, usage
- **ICE API** — REST verification engine with provider adapters
- **Worker** — async verification, webhook delivery, provider health

## Architecture

Modular monolith with clean architecture boundaries:

```text
Presentation → Application → Domain ← Infrastructure
```

Provider adapters implement `PaymentProvider`. The verification engine never depends on a concrete bank/provider SDK.

## Stack

| Layer | Tech |
| --- | --- |
| API | Node.js, Express, TypeScript |
| Worker | Node.js, TypeScript |
| Web | Next.js, Tailwind, TanStack Query + Table |
| Data | PostgreSQL, Prisma, Redis |
| Validation | Zod |
| Logging | Pino |

## Quick start (local)

### 1. Prerequisites

- Node.js 20+
- Docker (PostgreSQL + Redis)

### 2. Environment

```bash
cp .env.example .env
```

### 3. Infrastructure

```bash
docker compose up -d postgres redis
```

### 4. Install & migrate

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### 5. Run apps

```bash
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- OpenAPI: http://localhost:4000/api/docs

### Demo credentials

| Item | Value |
| --- | --- |
| Dashboard user | `demo@iceverification.dev` |
| Dashboard password | `demo-password-change-me` |
| API key | `ice_test_demo_key_do_not_use_in_production` |

### Demo verification + claim (anti-reuse)

```bash
# 1) Verify
curl -s http://localhost:4000/api/v1/verifications \
  -H "Authorization: Bearer ice_test_demo_key_do_not_use_in_production" \
  -H "Content-Type: application/json" \
  -d '{"provider":"demo","reference":"DEMO-VALID-001"}'

# 2) Claim so other systems cannot reuse the same receipt
curl -s http://localhost:4000/api/v1/claims \
  -H "Authorization: Bearer ice_test_demo_key_do_not_use_in_production" \
  -H "Content-Type: application/json" \
  -d '{"provider":"demo","reference":"DEMO-VALID-001","externalOrderId":"order_123"}'
```

Or verify with `"autoClaim": true`. See [`docs/claims.md`](./docs/claims.md).

**Available providers:** `demo`, `telebirr`, `cbe`, `cbebirr`, `boa`, `dashen` (Awash pending).

## Docker (all services)

```bash
docker compose up --build
```

## Repository layout

```text
apps/api        REST API
apps/worker     Background jobs
apps/web        Public site + dashboard
packages/domain Domain model & provider contracts
packages/*      Shared config, validation, SDK
prisma/         Schema, migrations, seed
docs/           Architecture & ADRs
```

## Tests

```bash
npm test
npm run typecheck
npm run lint
```

## Documentation

See [`docs/`](./docs/) for architecture, API, security, deployment, and roadmap.

## Security boundary

Live adapters use public receipt endpoints / authorized channels where available. Demo data is always labeled `environment: demo`. Prefer API keys for server-to-server calls; dashboard login uses an httpOnly session cookie.
