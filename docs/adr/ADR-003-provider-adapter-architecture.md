# ADR-003 Provider Adapter Architecture

## Decision

All providers implement `PaymentProvider` and register in `ProviderRegistry`. Verification engine depends only on the interface.
