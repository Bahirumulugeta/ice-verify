# ADR-001 Modular Monolith

## Decision

Ship V1 as a modular monolith (`api`, `worker`, `web` + domain packages) instead of microservices.

## Rationale

Clear module boundaries with lower operational complexity. Services can be extracted later when needed.
