# Development environment

## Supported local setup

| Tool | Supported version | Purpose |
| --- | --- | --- |
| Node.js | 24.19 LTS | Web application and workspace tooling |
| pnpm | 11.19 | Reproducible JavaScript dependencies |
| Python | 3.10+ | Ingestion and AI extraction service |
| Git | Current stable | Version control and Jira-linked branches |
| Docker Desktop | Current stable | PostgreSQL and the local service stack |
| Ollama | Current stable | Local AI runtime from ASCRM-30 |

Run the preflight from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-environment.ps1
```

## First-time setup

```powershell
Copy-Item .env.example .env
py -m venv .venv
pnpm.cmd install
pnpm.cmd db:up
pnpm.cmd db:migrate
pnpm.cmd dev
```

If the Windows `py` launcher is unavailable, use any installed Python 3.10-or-newer executable:

```powershell
python -m venv .venv
```

Use `pnpm.cmd` in Windows PowerShell when its script policy blocks `pnpm.ps1`.

## Environment boundaries

- **Local:** developer machine, local PostgreSQL container, local Ollama, non-secret defaults.
- **CI:** clean dependency install, type-check, lint, tests, and production build. Secrets are injected by the CI platform.
- **Production:** containerized web and ingestion services with managed secrets and PostgreSQL. No `.env` file is committed or built into images.

## Configuration ownership

| Variable | Required | Owner | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | Web | Runtime mode; use `development` locally |
| `APP_URL` | Yes | Web | Public base URL |
| `DATABASE_URL` | Yes | Platform | PostgreSQL connection string; secret outside local development |
| `REVIEWER_EMAIL` | Yes | Web | Server-controlled reviewer identity until authentication is introduced |
| `POSTGRES_DB` | Yes | Platform | Local container database name |
| `POSTGRES_USER` | Yes | Platform | Local container database user |
| `POSTGRES_PASSWORD` | Yes | Platform | Local-only default; managed as a secret outside development |
| `POSTGRES_PORT` | Yes | Platform | Local host port mapped to PostgreSQL |
| `NER_MODEL` | Yes | AI | Ollama model identifier |
| `OLLAMA_HOST` | Yes | AI/Platform | AI runtime endpoint |
| `SIGNAL_SOURCE_RSS` | Yes | AI | Initial market-signal source |
| `SIGNAL_SOURCE_NAME` | Yes | AI | Stable display name used when upserting the source |
| `INGESTION_OUTPUTS` | Yes | AI | Comma-separated enabled sinks, such as `postgres,csv` |
| `SALESFORCE_*` | No | Integration | Only needed when the Salesforce adapter is enabled |

## Verification

Before review, run:

```powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd build
pnpm.cmd db:migrate
```

The web health check is available at `http://localhost:3000/api/health`. The migration command is idempotent and must succeed before review when a database migration changes.

The preflight checks whether required command-line tools can run. Docker Desktop must also show a running engine before starting PostgreSQL; verify that separately with `docker info` if `db:up` cannot connect.
