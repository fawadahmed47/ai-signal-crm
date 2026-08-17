# ADR-001: Application stack

- **Status:** Accepted
- **Date:** 2026-08-16
- **Jira:** ASCRM-6

## Decision

Use Next.js with TypeScript for the operator application, PostgreSQL for durable CRM state, and retain the existing Python/Ollama pipeline as an independently deployable ingestion service.

## Rationale

The stack supports a polished internal application, typed server/client contracts, relational CRM workflows, local AI execution, independent service deployment, and a credible migration path from CSV and Salesforce integrations.

## Consequences

- The web application uses the Next.js App Router and standalone production output.
- Service integration must use explicit contracts rather than shared runtime state.
- PostgreSQL becomes the CRM system of record; CSV becomes an import/export format.
- Docker and CI must build the web and ingestion services separately.

