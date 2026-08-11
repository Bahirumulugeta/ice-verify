# Payment claims (consume / anti-reuse)

ICE Verification can act as a **standalone payment verifier** for other websites and backends. After you verify a receipt, **claim** it so the same provider reference cannot be reused by another merchant or system.

## Recommended integration flow

1. Customer pays via Telebirr / CBE / etc. and sends you the reference.
2. `POST /api/v1/verifications` with `provider` + `reference` (and suffix/phone when required).
3. If `verified: true`, fulfill only after claiming:
   - either `POST /api/v1/claims` with `{ provider, reference, externalOrderId }`
   - or verify with `"autoClaim": true`
4. Mark your order as paid in your own database.
5. Later calls from other merchants with `rejectIfClaimed: true` (default) receive `409 PAYMENT_ALREADY_CLAIMED`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/claims` | Claim/consume after a successful verification |
| GET | `/claims/:provider/:reference` | Check whether a payment is already claimed |
| GET | `/claims` | List your merchant claims |
| POST | `/claims/:id/release` | Release a claim (refunds / cancellations) |

## Verify options

```json
{
  "provider": "demo",
  "reference": "DEMO-VALID-001",
  "rejectIfClaimed": true,
  "autoClaim": true,
  "externalOrderId": "order_123"
}
```

- `rejectIfClaimed` (default `true`): fail if **another** merchant already claimed the payment.
- `autoClaim`: after a successful verify, claim for the calling merchant in the same request.

## Rules

- Claim requires a **successful verification** by the same merchant first (unless `autoClaim` did it atomically).
- `(provider, reference)` is globally unique while status is `CLAIMED`.
- Release returns the payment to an unclaimed state so it can be claimed again.
