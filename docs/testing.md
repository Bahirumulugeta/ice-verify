# Testing

Vitest + Supertest.

## Layers

- Domain: state machine, risk engine, money
- Application: verification pipeline rules
- Provider contract suite for every adapter
- API auth/validation/idempotency
- Security: SSRF, revoked keys, rate limits

```bash
npm test
```
