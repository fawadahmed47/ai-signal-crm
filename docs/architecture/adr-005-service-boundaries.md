# ADR-005: Independently deployable service boundaries

- **Status:** Accepted
- **Date:** 2026-08-17
- **Jira:** ASCRM-10

## Decision

Keep the Next.js operator application and Python ingestion worker independently deployable, with PostgreSQL-backed and versioned contracts between them.

## Rationale

The services have different runtimes, scaling characteristics, and failure modes. Separating them allows ingestion to retry or run on a schedule without coupling its lifecycle to the interactive application.

## Consequences

- The web application owns operator workflows and application APIs.
- The ingestion worker owns collection, retrieval, AI extraction, and normalization.
- Shared behavior is expressed through explicit contracts rather than shared process memory.
- CI and production delivery build and verify each service independently.
