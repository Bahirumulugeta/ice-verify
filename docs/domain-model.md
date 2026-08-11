# Domain Model

## Modules

Verification, Payment, Provider, Merchant, API Key, Risk, Webhook, Audit, Usage, User

## Verification status machine

```text
CREATED → PROCESSING → VERIFIED
                     → NOT_FOUND
                     → PENDING
                     → FAILED
                     → PROVIDER_UNAVAILABLE
                     → AMOUNT_MISMATCH
                     → RECEIVER_MISMATCH
                     → DUPLICATE
                     → INVALID_REQUEST

PROVIDER_UNAVAILABLE → PROCESSING (retry)
PENDING → PROCESSING / terminal outcomes
```

Invalid transitions throw `INVALID_STATE_TRANSITION`.

## Payment details

Normalized fields: reference, provider, amount, currency, sender, receiver, transactionDate, status, providerTransactionId, metadata.

Provider-specific payloads stay in controlled metadata.

## Risk levels

`LOW`, `MEDIUM`, `HIGH`, `CRITICAL` derived from rule score.
