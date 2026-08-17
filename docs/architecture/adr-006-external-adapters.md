# ADR-006: External systems as adapters

- **Status:** Accepted
- **Date:** 2026-08-17
- **Jira:** ASCRM-10

## Decision

Treat CSV files, Salesforce, analytics exports, AI providers, and source-specific collectors as replaceable adapters around the Signal CRM domain rather than as its system of record.

## Rationale

Keeping external systems behind adapters prevents provider-specific formats and availability from controlling the core data model. It also supports incremental migration from the existing pipeline and future replacement of local Ollama with a hosted AI provider.

## Consequences

- Adapter payloads are converted to versioned internal contracts.
- CSV remains an optional import/export mechanism.
- External CRM synchronization must preserve internal evidence and audit history.
- Provider changes should not require redesigning core accounts, signals, reviews, or opportunities.
