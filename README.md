# AI Signal CRM

AI Signal CRM is an AI-native commercial workspace that converts unstructured market signals into reviewed accounts, prioritized opportunities, outreach drafts, tasks, and native analytics.

## Repository structure

- `apps/web` — Next.js CRM application
- `services/ingestion` — Python news collection and AI extraction service
- `database` — versioned migrations and seed data
- `packages/shared` — shared contracts and domain utilities
- `infrastructure/docker` — container and local-stack assets
- `docs/architecture` — architecture decisions and diagrams
- `docs/design` — approved design references
- `tests` — cross-service and end-to-end tests

## Prerequisites

- Node.js 20 or newer
- pnpm 11
- Python 3.10 or newer
- Docker Desktop for the local service stack
- Ollama for local extraction

## Quick start

```powershell
Copy-Item .env.example .env
powershell -ExecutionPolicy Bypass -File scripts/check-environment.ps1
pnpm.cmd install
pnpm.cmd db:up
pnpm.cmd db:migrate
pnpm.cmd dev
```

The web application is available at `http://localhost:3000`. Its health endpoint is `/api/health`. PostgreSQL is available on `localhost:5432` by default.

Local migrations seed two development-only users:

- Commercial manager: `manager@aisignalcrm.local` / `Manager2026!`
- Signal reviewer: `marketer@aisignalcrm.local` / `Marketer2026!`

The ingestion worker can run once with `INGESTION_RUN_ONCE=true python services/ingestion/worker.py`, or continuously using `INGESTION_INTERVAL_SECONDS`. Every run is recorded in PostgreSQL for health and history reporting.

### Local reference data

Run `pnpm.cmd db:seed` to load four signals, three accounts, three opportunities, three tasks, and activity history for local reference testing. Re-running it replaces only those reference records. Run `pnpm.cmd db:seed:clear` to remove them.

## Delivery rules

- No secrets or runtime data are committed.
- Every change references its Jira key.
- Production builds and automated checks must pass before review.
- GitHub Actions enforces web checks and ingestion tests against migrated PostgreSQL.
- AI-generated CRM changes require explicit human approval.

See [the architecture overview](docs/architecture/overview.md) for system boundaries and data flow.
See [the development environment guide](docs/development-environment.md) for supported versions, configuration ownership, and verification.
