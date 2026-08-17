# Architecture decision records

Architecture decision records (ADRs) capture decisions that materially affect how Signal CRM is designed, operated, and extended. They describe the chosen approach, its rationale, and its consequences. Accepted ADRs remain in the repository even when superseded so the history of a decision stays visible.

## Index

| ADR | Decision | Status |
| --- | --- | --- |
| [ADR-001](adr-001-application-stack.md) | Application stack | Accepted |
| [ADR-002](adr-002-system-of-record.md) | PostgreSQL as the system of record | Accepted |
| [ADR-003](adr-003-human-controlled-mutations.md) | Human-controlled CRM mutations | Accepted |
| [ADR-004](adr-004-evidence-and-auditability.md) | Evidence retention and auditability | Accepted |
| [ADR-005](adr-005-service-boundaries.md) | Independently deployable service boundaries | Accepted |
| [ADR-006](adr-006-external-adapters.md) | External systems as adapters | Accepted |

## Lifecycle

New records use the next sequential number and one of these statuses: Proposed, Accepted, Deprecated, or Superseded. A change that reverses an accepted decision creates a new ADR and marks the old record as superseded rather than deleting it.

These records were formalized under `ASCRM-10`. The initial system and repository direction originated under `ASCRM-6`.
