# ADR-002: PostgreSQL as the system of record

- **Status:** Accepted
- **Date:** 2026-08-17
- **Jira:** ASCRM-10

## Decision

Use PostgreSQL as the durable system of record for source evidence, extracted signals, human reviews, companies, accounts, opportunities, tasks, and activity history.

## Rationale

Signal CRM requires relational integrity, transactional review workflows, reproducible migrations, and traceability from commercial records back to source evidence. A single durable store also prevents CSV exports and external CRM integrations from becoming competing sources of truth.

## Consequences

- Schema changes are versioned as repeatable migrations.
- Ingestion and application services exchange data through explicit database or API contracts.
- Imports must be idempotent and preserve human review state when extraction is retried.
- Local and production environments must provide compatible PostgreSQL behavior.
