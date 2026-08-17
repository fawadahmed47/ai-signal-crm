# Database

PostgreSQL is the Signal CRM system of record. Schema changes are versioned as ordered SQL migrations and must be reproducible from an empty database.

## Initial domain model

- `companies` stores deduplicated organizations.
- `company_aliases` maps normalized name variants to one company.
- `signal_sources`, `signals`, and `signal_evidence` preserve origin and evidence.
- `signal_reviews` records human approval or rejection.
- `accounts` and `opportunities` model the commercial workflow.
- `crm_tasks` and `activity_events` provide execution and audit history.

## Apply locally

Start PostgreSQL and apply every pending migration from the repository root:

```powershell
pnpm.cmd db:up
pnpm.cmd db:migrate
```

The migration runner records applied filenames in `schema_migrations`; rerunning it is safe and only applies new files. Stop the local stack with `pnpm.cmd db:down`. The named Docker volume preserves data between restarts.

## Rules

1. Never edit an applied migration; add the next numbered migration.
2. Foreign keys and checks protect domain integrity.
3. Evidence is retained when a signal is reviewed.
4. AI scores are advisory and constrained to 0–100.
5. Human decisions are recorded in `signal_reviews`.
6. Company matching uses deterministic identity keys; uncertain fuzzy matches require human review.
7. Approving a matched signal creates its company account atomically, or reuses the existing account.
8. Opportunities belong to accounts and progress through identified, qualified, proposal, won, or lost stages.
9. Outreach is stored as a reviewable draft with its source snapshot; generation never sends communication.
10. Task creation and completion write an activity event in the same short transaction.
