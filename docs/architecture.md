# Architecture

## Style

ICE Verification V1 is a **modular monolith** using clean architecture and dependency inversion.

```text
Presentation (HTTP / Next.js)
        ↓
Application (use cases)
        ↓
Domain (entities, VOs, rules, PaymentProvider)
        ↑
Infrastructure (Prisma, Redis, providers, queue)
```

## Applications

- `apps/api` — synchronous HTTP API, auth, verification orchestration
- `apps/worker` — async verification, webhooks, health checks
- `apps/web` — public marketing site + developer dashboard

## Core rule

The verification engine depends only on `PaymentProvider`, never on Telebirr/CBE/etc. concrete types.

## Provider adapter flow

```text
HTTP → Auth → Validation → Idempotency → ProviderRegistry
     → Cache → PaymentProvider.verify → Normalize
     → Amount/Receiver/Currency checks → Duplicate detection
     → RiskEngine → Persist → Events/Webhooks
```

## Data authority

- PostgreSQL is the source of truth for verifications, keys, webhooks, audit, usage
- Redis is used for cache, rate limits, locks, and queue transport

## Evolution path

V1 modular monolith → V2 authorized real providers → V3 extract services only when operationally justified.
