# Ingestion service

This service contains the reusable collector, article fetcher, AI extractor, normalization pipeline, and durable signal outputs from the original data-center intelligence project.

The original runtime artifacts were intentionally excluded:

- `output.csv`
- `seen.db`
- processing and collector logs
- Python bytecode

## Signal contract

Every successful extraction is converted to `SignalContract` version `1.0` before database persistence. The contract maps legacy extraction fields to CRM concepts:

| Extraction field | CRM field |
| --- | --- |
| `provider_name` | `companies.canonical_name` |
| article URL | `signals.external_id` and `signal_evidence.url` |
| `news_title` | `signals.title` and initial summary |
| `power_MW` | `signals.power_capacity_mw` |
| `investment_usd_m` | `signals.investment_usd_millions` |
| city/state/country | `signals.location_text` |

The complete versioned contract is retained in `signals.raw_payload`. Reprocessing the same feed URL updates extracted fields without changing human review status.

## Install

From the repository root:

```powershell
& .venv\Scripts\python.exe -m pip install -r services/ingestion/requirements.txt
```

## Run

Start and migrate PostgreSQL first, then expose the local connection string to the process:

```powershell
pnpm.cmd db:up
pnpm.cmd db:migrate
$env:DATABASE_URL = "postgresql://signal_crm:signal_crm@localhost:5432/signal_crm"
& .venv\Scripts\python.exe services/ingestion/main.py
```

`INGESTION_OUTPUTS` is a comma-separated adapter list. It defaults to `postgres,csv`. Supported configurations are:

- `postgres,csv` — durable CRM persistence followed by the legacy CSV adapter.
- `postgres` — PostgreSQL only.
- `csv` — compatibility mode without a database.

PostgreSQL is deliberately written before CSV. Collector URLs are marked processed only after every configured adapter succeeds, so a database failure is retried rather than silently losing the signal. Extraction errors remain unprocessed for retry.

## Test

```powershell
& .venv\Scripts\python.exe -m unittest discover -s services/ingestion/tests -v
```

Set `TEST_DATABASE_URL` to include the live idempotency test; its deterministic verification records are removed after the run:

```powershell
$env:TEST_DATABASE_URL = "postgresql://signal_crm:signal_crm@localhost:5432/signal_crm"
& .venv\Scripts\python.exe -m unittest discover -s services/ingestion/tests -v
```
