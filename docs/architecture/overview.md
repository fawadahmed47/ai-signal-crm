# Architecture overview

## Objective

Signal CRM turns external market signals into traceable commercial actions while keeping a human responsible for every material CRM mutation.

## System boundaries

1. **Web application (`apps/web`)** — operator interface, application API, approvals, accounts, opportunities, tasks, and analytics.
2. **Ingestion service (`services/ingestion`)** — RSS collection, article retrieval, AI extraction, normalization, and signal delivery.
3. **PostgreSQL (`database`)** — durable CRM records, evidence, feedback, and audit history.
4. **AI runtime** — local Ollama initially, accessed behind the ingestion service so a hosted provider can be introduced without changing the CRM domain.
5. **External integrations** — Salesforce, CSV, and analytics exports remain adapters rather than the system of record.

## Primary data flow

```text
RSS/news source
  -> Python ingestion service
  -> structured signal with source evidence
  -> PostgreSQL review queue
  -> Signal Inbox
  -> human approval or rejection
  -> account and opportunity mutation
  -> activity history and native analytics
```

## Repository decisions

- A single repository keeps contracts, delivery assets, and documentation versioned together during the MVP.
- The web and ingestion services remain independently deployable.
- Runtime output such as CSV files, logs, and SQLite databases is excluded from version control.
- Database changes will be migration-first and reproducible from an empty database.
- Containerized production delivery uses a standalone Next.js build and a separate Python worker image.

## Security and trust

- Secrets are supplied through environment configuration and never committed.
- Evidence URLs are retained with every imported signal.
- AI scores and explanations are advisory.
- Approval, rejection, and correction actions are auditable.
- Automatic outreach and silent CRM mutations are outside the MVP scope.

## Jira traceability

The foundation is implemented under `ASCRM-6`. Subsequent database, UI, ingestion, and delivery changes use their own Jira keys and pull requests.

## Data model

The initial PostgreSQL schema is versioned in `database/migrations/0001_initial_schema.sql` under `ASCRM-7`. It separates source evidence, AI-generated signal data, human reviews, and CRM records so every commercial mutation remains traceable.
