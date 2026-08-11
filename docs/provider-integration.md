# Provider Integration

## Contract

Implement `PaymentProvider`:

- `getName()`
- `getCapabilities()`
- `verify()`
- `healthCheck()`
- `getIntegrationStatus()`

## Adding a provider

1. Create adapter implementing `PaymentProvider`
2. Define capabilities
3. Implement authorized authentication
4. Normalize responses to `PaymentDetails`
5. Implement health check
6. Add contract tests
7. Register in `ProviderRegistry`

The verification engine should not need changes.

## Current providers

| Provider | Status |
| --- | --- |
| demo | available (deterministic) |
| telebirr | available (public receipt + optional Ethiopia relays) |
| cbe | pending |
| cbebirr | pending |
| boa | pending |
| dashen | pending |
| awash | pending |

## Telebirr

Adapted from the `verifier-api` reference implementation:

1. Fetch public receipt HTML from `https://transactioninfo.ethiotelecom.et/receipt/{reference}`
2. Parse amount, payer, receiver, status, fees
3. If primary fetch fails (common outside Ethiopia), try configured `TELEBIRR_FALLBACK_PROXIES`

Configure:

```env
TELEBIRR_PRIMARY_RECEIPT_URL=https://transactioninfo.ethiotelecom.et/receipt/
TELEBIRR_FALLBACK_PROXIES=https://your-ethiopia-relay/telebirr?ref=
TELEBIRR_SKIP_PRIMARY=false
```

Lookup API shape (recommended):

```json
{ "provider": "telebirr", "reference": "CJU5RZ5NM3" }
```

Optional fulfillment checks (`expectedAmount`, `expectedReceiver`) remain supported.
