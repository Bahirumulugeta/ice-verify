# API

Base path: `/api/v1`

Auth:

- `Authorization: Bearer ice_test_...` or `ice_live_...` (server integrations)
- Session cookie `ice_session` from `POST /auth/login` (dashboard)

OpenAPI UI: `/api/docs` · Spec: `/api/openapi.json`

## Core endpoints

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/verifications` | API key / session |
| GET | `/verifications` | API key / session |
| GET | `/verifications/:id` | API key / session |
| POST | `/verifications/batch` | API key / session |
| POST | `/verifications/parse` | API key / session |
| POST | `/verifications/image` | API key / session (multipart) |
| POST | `/claims` | API key / session |
| GET | `/claims` | API key / session |
| GET | `/claims/:provider/:reference` | API key / session |
| POST | `/claims/:id/release` | Owner/Admin |
| GET | `/plans` | public |
| GET/POST | `/billing/plan` | API key / session (select = Owner/Admin) |
| GET | `/providers` | public |
| GET | `/health` | public |
| POST | `/auth/login` | public |
| GET | `/auth/me` | API key / session |
| POST | `/auth/logout` | public |
| GET/POST/DELETE | `/api-keys` | Owner/Admin |
| GET/POST/DELETE | `/webhooks` | list any; mutate Owner/Admin |
| GET | `/usage` | API key / session |
| GET | `/audit-logs` | Owner/Admin |

## Providers

| Provider | Extra fields |
| --- | --- |
| `demo` | none (`DEMO-*` references) |
| `telebirr` | reference only |
| `cbe` | `accountSuffix` (8 digits) for legacy FT refs |
| `boa` | `accountSuffix` (5 digits) |
| `cbebirr` | `phoneNumber` |
| `dashen` | reference only |
| `awash` | pending |

## Idempotency

Send `Idempotency-Key`. Same key + same payload returns the original response. Same key + different payload returns `409 IDEMPOTENCY_CONFLICT`.

## Anti-reuse (claims)

See [claims.md](./claims.md). Default verify rejects payments already claimed by another merchant (`PAYMENT_ALREADY_CLAIMED`).

## Error shape

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_ALREADY_CLAIMED",
    "message": "This payment was already claimed and cannot be reused",
    "requestId": "req_..."
  }
}
```
