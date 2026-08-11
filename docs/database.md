# Database

PostgreSQL + Prisma.

## Important constraints

- `ApiKey.keyHash` unique
- `IdempotencyKey (merchantId, key)` unique
- `DuplicateReference (merchantId, provider, reference, scope)` unique
- Foreign keys on merchant-owned resources
- Indexes on verification merchant/createdAt, provider/reference, webhook delivery status

## Integrity rule

Critical uniqueness/idempotency is enforced in PostgreSQL, not only in application code.

Prisma remains an infrastructure concern and is not imported by domain packages.
