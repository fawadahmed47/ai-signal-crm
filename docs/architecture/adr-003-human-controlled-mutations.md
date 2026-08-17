# ADR-003: Human-controlled CRM mutations

- **Status:** Accepted
- **Date:** 2026-08-17
- **Jira:** ASCRM-10

## Decision

Require an explicit human decision before an AI-derived signal creates or materially changes an account, opportunity, task, or outbound communication.

## Rationale

AI extraction, scoring, and explanations are advisory and can be incomplete or incorrect. Human review protects CRM quality, establishes accountability, and lets reviewer corrections improve later processing.

## Consequences

- New signals enter an unreviewed queue.
- Approval, rejection, and corrections are persisted with reviewer identity and time.
- Automated scoring may prioritize work but cannot silently mutate CRM records.
- Automatic outreach is outside the MVP; generated drafts require human review.
