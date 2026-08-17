import "server-only";

import { getDatabasePool } from "@/data/db";
import { composeOutreachDraft } from "@/data/outreach-core";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function generateOutreachDraft(accountId: string, generatedByValue: string) {
  if (!UUID_PATTERN.test(accountId)) return { status: "account_not_found" as const };
  const generatedByEmail = generatedByValue.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(generatedByEmail)) throw new Error("A valid generator email is required.");
  const pool = getDatabasePool();
  const context = await pool.query<{
    company_name: string;
    signal_id: string | null;
    signal_title: string | null;
    signal_summary: string | null;
    opportunity_id: string | null;
    opportunity_name: string | null;
  }>(
    `SELECT c.canonical_name AS company_name,
            s.id::text AS signal_id, s.title AS signal_title, s.summary AS signal_summary,
            o.id::text AS opportunity_id, o.name AS opportunity_name
     FROM accounts a
     JOIN companies c ON c.id = a.company_id
     LEFT JOIN LATERAL (
       SELECT id, title, summary FROM signals
       WHERE company_id = c.id AND status = 'approved'
       ORDER BY opportunity_score DESC NULLS LAST, imported_at DESC LIMIT 1
     ) s ON true
     LEFT JOIN LATERAL (
       SELECT id, name FROM opportunities
       WHERE account_id = a.id AND stage NOT IN ('won', 'lost')
       ORDER BY updated_at DESC LIMIT 1
     ) o ON true
     WHERE a.id = $1`,
    [accountId],
  );
  if (!context.rowCount) return { status: "account_not_found" as const };
  const source = context.rows[0];
  if (!source.signal_id || !source.signal_title || !source.signal_summary) {
    return { status: "signal_required" as const };
  }
  const copy = composeOutreachDraft({
    companyName: source.company_name,
    signalTitle: source.signal_title,
    signalSummary: source.signal_summary,
    opportunityName: source.opportunity_name,
  });
  const inserted = await pool.query<{
    id: string; subject: string; body: string; status: "draft"; generated_by_email: string; created_at: Date;
  }>(
    `INSERT INTO outreach_drafts (
       account_id, source_signal_id, opportunity_id, subject, body,
       generated_by_email, source_snapshot
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id::text, subject, body, status, generated_by_email, created_at`,
    [accountId, source.signal_id, source.opportunity_id, copy.subject, copy.body, generatedByEmail,
      JSON.stringify({ companyName: source.company_name, signalTitle: source.signal_title, signalSummary: source.signal_summary, opportunityName: source.opportunity_name })],
  );
  const row = inserted.rows[0];
  return { status: "created" as const, draft: { id: row.id, subject: row.subject, body: row.body, status: row.status, generatedByEmail: row.generated_by_email, createdAt: row.created_at.toISOString() } };
}
