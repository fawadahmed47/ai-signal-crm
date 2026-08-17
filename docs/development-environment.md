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

If `py` is unavailable but the original pipeline environment exists, create the isolated environment with:

```powershell
& "C:\Users\USER1\Downloads\data_center_project_tracker\data_center_intelligence\.venv\Scripts\python.exe" -m venv .venv
```

Use `pnpm.cmd` in Windows PowerShell when its script policy blocks `pnpm.ps1`.

## Environment boundaries

- **Local:** developer machine, local PostgreSQL container, local Ollama, non-secret defaults.
- **CI:** clean dependency install, type-check, lint, tests, and production build. Secrets are injected by the CI platform.
- **Production:** containerized web and ingestion services with managed secrets and PostgreSQL. No `.env` file is committed or built into images.

## Configuration ownership

| Variable | Required | Owner | Notes |
| --- | --- | --- | --- |
| `APP_URL` | Yes | Web | Public base URL |
| `DATABASE_URL` | Yes | Platform | PostgreSQL connection string; secret outside local development |
| `NER_MODEL` | Yes | AI | Ollama model identifier |
| `OLLAMA_HOST` | Yes | AI/Platform | AI runtime endpoint |
| `SIGNAL_SOURCE_RSS` | Yes | AI | Initial market-signal source |
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
