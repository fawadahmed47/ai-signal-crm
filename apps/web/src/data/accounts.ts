import "server-only";

import { getDatabasePool } from "@/data/db";
import type { AccountIntelligenceDTO, AccountListDTO } from "@/types/account";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getAccounts(): Promise<AccountListDTO[]> {
  const result = await getDatabasePool().query<{
    id: string;
    company_name: string;
    website: string | null;
    country_code: string | null;
    owner_email: string;
    commercial_lifecycle_stage: AccountListDTO["lifecycleStage"];
    opportunity_count: string;
    pipeline_value: string;
    latest_signal_at: Date | null;
  }>(
    `WITH opportunity_summary AS (
       SELECT account_id, count(*) AS opportunity_count,
              COALESCE(sum(amount_usd), 0) AS pipeline_value
       FROM opportunities GROUP BY account_id
     ), signal_summary AS (
       SELECT company_id, max(imported_at) AS latest_signal_at
       FROM signals GROUP BY company_id
     )
     SELECT a.id::text, c.canonical_name AS company_name, c.website, c.country_code,
            a.owner_email, a.commercial_lifecycle_stage,
            COALESCE(o.opportunity_count, 0)::text AS opportunity_count,
            COALESCE(o.pipeline_value, 0)::text AS pipeline_value,
            s.latest_signal_at
     FROM accounts a
     JOIN companies c ON c.id = a.company_id
     LEFT JOIN opportunity_summary o ON o.account_id = a.id
     LEFT JOIN signal_summary s ON s.company_id = c.id
     ORDER BY a.updated_at DESC, c.canonical_name`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    companyName: row.company_name,
    website: row.website,
    countryCode: row.country_code,
    ownerEmail: row.owner_email,
    lifecycleStage: row.commercial_lifecycle_stage,
    opportunityCount: Number(row.opportunity_count),
    pipelineValue: Number(row.pipeline_value),
    latestSignalAt: row.latest_signal_at?.toISOString() ?? null,
  }));
}

export async function getAccountIntelligence(id: string): Promise<AccountIntelligenceDTO | null> {
  if (!UUID_PATTERN.test(id)) return null;
  const pool = getDatabasePool();
  const accountResult = await pool.query<{
    id: string;
    company_id: string;
    company_name: string;
    website: string | null;
    country_code: string | null;
    owner_email: string;
    commercial_lifecycle_stage: AccountIntelligenceDTO["lifecycleStage"];
    created_at: Date;
    created_from_signal_id: string | null;
  }>(
    `SELECT a.id::text, a.company_id::text, c.canonical_name AS company_name,
            c.website, c.country_code, a.owner_email, a.commercial_lifecycle_stage,
            a.created_at, a.created_from_signal_id::text
     FROM accounts a
     JOIN companies c ON c.id = a.company_id
     WHERE a.id = $1`,
    [id],
  );
  if (!accountResult.rowCount) return null;
  const account = accountResult.rows[0];

  const [signals, opportunities, contacts, notes, tasks, activities, outreachDrafts] = await Promise.all([
    pool.query<{
      id: string;
      title: string;
      category: string;
      summary: string;
      status: string;
      lifecycle_stage: AccountIntelligenceDTO["signals"][number]["lifecycleStage"];
      opportunity_score: number | null;
      score_explanation: string | null;
      occurred_at: Date | null;
      evidence: Array<{ title: string; url: string }> | null;
    }>(
      `SELECT s.id::text, s.title, s.category, s.summary, s.status::text, s.lifecycle_stage,
              s.opportunity_score, s.score_explanation,
              COALESCE(s.occurred_at, s.published_at, s.imported_at) AS occurred_at,
              COALESCE(jsonb_agg(jsonb_build_object(
                'title', COALESCE(e.label, s.title), 'url', e.url
              ) ORDER BY e.created_at) FILTER (WHERE e.id IS NOT NULL), '[]'::jsonb) AS evidence
       FROM signals s
       LEFT JOIN signal_evidence e ON e.signal_id = s.id
       WHERE s.company_id = $1
       GROUP BY s.id
       ORDER BY COALESCE(s.occurred_at, s.published_at, s.imported_at) DESC`,
      [account.company_id],
    ),
    pool.query<{
      id: string;
      name: string;
      stage: AccountIntelligenceDTO["opportunities"][number]["stage"];
      amount_usd: string | null;
      probability: number | null;
      expected_close_date: string | null;
    }>(
      `SELECT id::text, name, stage, amount_usd::text, probability,
              expected_close_date::text
       FROM opportunities WHERE account_id = $1
       ORDER BY updated_at DESC`,
      [id],
    ),
    pool.query<{ id:string;full_name:string;job_title:string|null;email:string|null;phone:string|null;created_at:Date }>("SELECT id::text,full_name,job_title,email,phone,created_at FROM account_contacts WHERE account_id=$1 ORDER BY is_primary DESC,created_at DESC",[id]),
    pool.query<{ id:string;body:string;author_name:string|null;created_at:Date }>("SELECT n.id::text,n.body,u.display_name AS author_name,n.created_at FROM account_notes n LEFT JOIN app_users u ON u.id=n.author_user_id WHERE n.account_id=$1 ORDER BY n.created_at DESC",[id]),
    pool.query<{
      id:string; title:string; description:string|null; assignee_email:string;
      status:AccountIntelligenceDTO["tasks"][number]["status"]; due_at:Date|null;
    }>(
      `SELECT id::text,title,description,assignee_email,status,due_at
       FROM crm_tasks WHERE account_id=$1
       ORDER BY (status IN ('open','in_progress')) DESC,due_at NULLS LAST,created_at DESC`,[id]),
    pool.query<{
      id: string;
      event_type: string;
      actor_email: string;
      details: Record<string, unknown>;
      occurred_at: Date;
    }>(
      `SELECT id::text, event_type, actor_email, details, occurred_at
       FROM activity_events WHERE account_id = $1
       ORDER BY occurred_at DESC LIMIT 50`,
      [id],
    ),
    pool.query<{
      id: string;
      subject: string;
      body: string;
      status: "draft" | "archived";
      generated_by_email: string;
      created_at: Date;
    }>(
      `SELECT id::text, subject, body, status, generated_by_email, created_at
       FROM outreach_drafts WHERE account_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [id],
    ),
  ]);

  return {
    id: account.id,
    company: {
      name: account.company_name,
      website: account.website,
      countryCode: account.country_code,
    },
    ownerEmail: account.owner_email,
    lifecycleStage: account.commercial_lifecycle_stage,
    createdAt: account.created_at.toISOString(),
    originatingSignalId: account.created_from_signal_id,
    signals: signals.rows.map((signal) => ({
      id: signal.id,
      title: signal.title,
      category: signal.category,
      summary: signal.summary,
      status: signal.status,
      lifecycleStage: signal.lifecycle_stage,
      score: signal.opportunity_score,
      explanation: signal.score_explanation,
      occurredAt: signal.occurred_at?.toISOString() ?? null,
      evidence: signal.evidence ?? [],
    })),
    opportunities: opportunities.rows.map((opportunity) => ({
      id: opportunity.id,
      name: opportunity.name,
      stage: opportunity.stage,
      amountUsd: opportunity.amount_usd === null ? null : Number(opportunity.amount_usd),
      probability: opportunity.probability,
      expectedCloseDate: opportunity.expected_close_date,
    })),
    activities: activities.rows.map((activity) => ({
      id: activity.id,
      eventType: activity.event_type,
      actorEmail: activity.actor_email,
      details: activity.details,
      occurredAt: activity.occurred_at.toISOString(),
    })),
    outreachDrafts: outreachDrafts.rows.map((draft) => ({
      id: draft.id,
      subject: draft.subject,
      body: draft.body,
      status: draft.status,
      generatedByEmail: draft.generated_by_email,
      createdAt: draft.created_at.toISOString(),
    })),
    tasks: tasks.rows.map((task) => ({ id:task.id,title:task.title,description:task.description,
      assigneeEmail:task.assignee_email,status:task.status,dueAt:task.due_at?.toISOString() ?? null })),
    contacts: contacts.rows.map((contact)=>({id:contact.id,fullName:contact.full_name,jobTitle:contact.job_title,email:contact.email,phone:contact.phone,createdAt:contact.created_at.toISOString()})),
    notes: notes.rows.map((note)=>({id:note.id,body:note.body,authorName:note.author_name??"Former user",createdAt:note.created_at.toISOString()})),
  };
}
