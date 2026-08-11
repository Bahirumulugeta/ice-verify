# Observability

## Logging

Pino structured logs with `requestId`, route, provider, verificationId. Secrets redacted.

## Metrics readiness

Prepare counters/histograms for:

- verification_requests_total / success / failure / duration
- provider_latency / provider_errors
- cache_hits / cache_misses
- webhook_success / webhook_failure
- queue_depth
- api_requests_total / api_errors_total

OpenTelemetry instrumentation can wrap API/worker entrypoints without changing domain logic.
