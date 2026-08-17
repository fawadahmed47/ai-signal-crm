# ADR-004: Evidence retention and auditability

- **Status:** Accepted
- **Date:** 2026-08-17
- **Jira:** ASCRM-10

## Decision

Retain the source identity, evidence URL, extracted payload, and relevant processing metadata for every signal, and record human decisions and resulting CRM actions as auditable events.

## Rationale

Operators must be able to verify why a signal exists, understand why it was prioritized, and trace every resulting commercial action. Evidence-backed decisions are necessary for trust, debugging, and correction.

## Consequences

- Evidence remains linked to signals after review.
- Versioned raw extraction payloads are retained alongside normalized fields.
- Scores and explanations must be distinguishable from source facts.
- Review decisions and downstream mutations are append-only history rather than untraceable state changes.
