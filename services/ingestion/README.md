# Ingestion service

This service contains the reusable collector, article fetcher, AI extractor, normalization pipeline, and durable signal outputs from the original data-center intelligence project.

The original runtime artifacts were intentionally excluded:

- `output.csv`
- `seen.db`
- processing and collector logs
- Python bytecode

## Signal contract

Every successful extraction is converted to `SignalContract` version `1.3` before database persistence. The contract maps legacy extraction fields to CRM concepts:

| Extraction field | CRM field |
| --- | --- |
| `provider_name` | `companies.canonical_name` |
| article URL | `signals.external_id` and `signal_evidence.url` |
| `news_title` | `signals.title` and initial summary |
| `power_MW` | `signals.power_capacity_mw` |
| `investment_usd_m` | `signals.investment_usd_millions` |
| city/state/country | `signals.location_text` |

The complete versioned contract is retained in `signals.raw_payload`. Reprocessing the same feed URL updates extracted fields without changing human review status.

## Company identity

Company names are converted to conservative identity keys before persistence. Case, Unicode presentation, punctuation, ampersands, a leading `The`, and common trailing legal suffixes are normalized. For example, `Acme Data, Inc.` and `The ACME Data Corporation` resolve to one company. Fuzzy matching is intentionally excluded because it could silently merge unrelated organizations.

PostgreSQL stores the resolved identity in `companies.normalized_name` and maintains matching keys in `company_aliases`. Company resolution is an atomic upsert, so concurrent ingestion cannot create duplicates for the same identity. The original extracted name remains available in the versioned raw signal payload for auditability.

## Opportunity scoring

Every non-error signal receives a deterministic advisory score from 0 to 100. Scoring version `1.0` uses four components:

| Component | Maximum | Inputs |
| --- | ---: | --- |
| Signal category | 35 | Construction, expansion, investment, or other |
| Investment scale | 25 | Extracted investment in USD millions |
| Power capacity | 20 | Extracted capacity in MW |
| Evidence completeness | 20 | URL, company, publication date, location, and title |

The total is stored in `signals.opportunity_score`. Its version and component breakdown are retained in `signals.raw_payload`, allowing a score to be reproduced and audited. Recency is not included because the review queue already sorts by import time; this keeps reprocessing deterministic. Scores prioritize human review and never approve or mutate CRM records automatically.

## Evidence-based explanations

Explanation version `1.0` creates a review-ready narrative from the same extracted facts and scoring components. Each explanation explicitly separates:

- **Evidence** — headline, company, category, quantified investment or capacity, location, publication date, and retained source URL when available.
- **Score** — the total and contribution from every documented scoring component.
- **Commercial interpretation** — a category-level reason the signal may warrant review, clearly labeled as interpretation rather than source fact.

Missing values are omitted rather than inferred. The explanation is stored in `signals.score_explanation`; its version and structured fact list are retained in `signals.raw_payload`. Every explanation ends with a reminder to review the source before taking CRM action.

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
