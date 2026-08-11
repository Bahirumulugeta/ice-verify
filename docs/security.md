# Security

## Controls

- API keys hashed with pepper (raw secret shown once)
- Dashboard auth separate from merchant API keys
- Rate limiting headers
- Helmet secure headers + CORS allowlist
- Zod validation
- Webhook HMAC signatures + timestamp tolerance
- SSRF protections for webhook URLs
- Audit logging for sensitive actions
- Structured log redaction for secrets

## Explicit non-goals

No credential bypass, scraping, session hijacking, or unauthorized banking access.
