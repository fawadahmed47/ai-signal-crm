import "server-only";

import { getDatabasePool } from "@/data/db";
import type { AnalyticsBreakdownDTO, AnalyticsReportDTO } from "@/types/analytics";

type SummaryRow = {
  total_signals: string;
  approved_signals: string;
  total_accounts: string;
  open_pipeline_value: string;
  won_revenue: string;
};

type CountRow = { label: string; count: string; value?: string };
type TrendRow = { week_start: string; imported: string; approved: string };
type DataQualityRow = { missing_company_fields: string; missing_contact_fields: string; low_confidence_leads: string; missing_or_broken_evidence: string; corrections_waiting_review: string };

const SIGNAL_STATUS_ORDER = ["pending", "approved", "rejected"];
const PIPELINE_STAGE_ORDER = ["identified", "qualified", "proposal", "won", "lost"];
const TASK_HEALTH_ORDER = ["open", "in progress", "overdue", "completed", "cancelled"];

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function orderBreakdown(rows: CountRow[], order: string[]): AnalyticsBreakdownDTO[] {
  const byLabel = new Map(rows.map((row) => [row.label, row]));
  return order.map((label) => {
    const row = byLabel.get(label);
    return {
      label: titleCase(label),
      count: Number(row?.count ?? 0),
      ...(row?.value === undefined ? {} : { value: Number(row.value) }),
    };
  });
}

export async function getAnalyticsReport(): Promise<AnalyticsReportDTO> {
  const pool = getDatabasePool();
  const [summary, signalStatuses, signalCategories, pipelineStages, taskHealth, weeklyTrend, sourcePerformance, reviewerPerformance, dataQuality] =
    await Promise.all([
      pool.query<SummaryRow>(
        `SELECT signal_totals.total_signals::text,
                signal_totals.approved_signals::text,
                account_totals.total_accounts::text,
                opportunity_totals.open_pipeline_value::text,
                opportunity_totals.won_revenue::text
         FROM (
           SELECT count(*) AS total_signals,
                  count(*) FILTER (WHERE status = 'approved') AS approved_signals
           FROM signals
         ) signal_totals
         CROSS JOIN (SELECT count(*) AS total_accounts FROM accounts) account_totals
         CROSS JOIN (
           SELECT coalesce(sum(amount_usd) FILTER (WHERE stage NOT IN ('won', 'lost')), 0)
                    AS open_pipeline_value,
                  coalesce(sum(amount_usd) FILTER (WHERE stage = 'won'), 0) AS won_revenue
           FROM opportunities
         ) opportunity_totals`,
      ),
      pool.query<CountRow>(
        `SELECT status::text AS label, count(*)::text AS count
         FROM signals GROUP BY status`,
      ),
      pool.query<CountRow>(
        `SELECT category AS label, count(*)::text AS count
         FROM signals GROUP BY category
         ORDER BY count(*) DESC, category ASC LIMIT 6`,
      ),
      pool.query<CountRow>(
        `SELECT stage::text AS label, count(*)::text AS count,
                coalesce(sum(amount_usd), 0)::text AS value
         FROM opportunities GROUP BY stage`,
      ),
      pool.query<CountRow>(
        `SELECT health AS label, count(*)::text AS count
         FROM (
           SELECT CASE
             WHEN status IN ('open', 'in_progress') AND due_at < now() THEN 'overdue'
             ELSE replace(status::text, '_', ' ')
           END AS health
           FROM crm_tasks
         ) task_health
         GROUP BY health`,
      ),
      pool.query<TrendRow>(
        `WITH weeks AS (
           SELECT generate_series(
             date_trunc('week', now()) - interval '5 weeks',
             date_trunc('week', now()), interval '1 week'
           ) AS week_start
         )
         SELECT to_char(w.week_start, 'DD Mon') AS week_start,
                count(s.id)::text AS imported,
                count(s.id) FILTER (WHERE s.status = 'approved')::text AS approved
         FROM weeks w
         LEFT JOIN signals s ON s.imported_at >= w.week_start
                            AND s.imported_at < w.week_start + interval '1 week'
         GROUP BY w.week_start ORDER BY w.week_start`,
      ),
      pool.query<{ source:string;imported:string;approved:string;pipeline_value:string }>(
        `WITH source_signals AS (
           SELECT s.source_id,
                  count(*) AS imported,
                  count(*) FILTER (WHERE s.status = 'approved') AS approved
           FROM signals s
           GROUP BY s.source_id
         ), source_pipeline AS (
           SELECT s.source_id, COALESCE(sum(o.amount_usd), 0) AS pipeline_value
           FROM signals s
           JOIN opportunities o ON o.source_signal_id = s.id
           GROUP BY s.source_id
         )
         SELECT COALESCE(ss.name, 'Unknown source') AS source,
                metrics.imported::text,
                metrics.approved::text,
                COALESCE(pipeline.pipeline_value, 0)::text AS pipeline_value
         FROM source_signals metrics
         LEFT JOIN signal_sources ss ON ss.id = metrics.source_id
         LEFT JOIN source_pipeline pipeline ON pipeline.source_id = metrics.source_id
         ORDER BY metrics.imported DESC`,
      ),
      pool.query<{ reviewer:string;reviewed:string;approved:string }>(
        `SELECT COALESCE(u.display_name,r.reviewer_email) AS reviewer,count(*)::text AS reviewed,
                count(*) FILTER (WHERE r.decision='approved')::text AS approved
         FROM signal_reviews r LEFT JOIN app_users u ON u.email=r.reviewer_email
         GROUP BY COALESCE(u.display_name,r.reviewer_email) ORDER BY count(*) DESC`,
      ),
      pool.query<DataQualityRow>(
        `SELECT
           ((SELECT count(*) FROM signals WHERE company_id IS NULL) +
            (SELECT count(*) FROM accounts a JOIN companies c ON c.id=a.company_id WHERE c.website IS NULL OR c.country_code IS NULL))::text AS missing_company_fields,
           (SELECT count(*) FROM accounts a WHERE NOT EXISTS (
              SELECT 1 FROM account_contacts contact
              WHERE contact.account_id=a.id AND contact.email IS NOT NULL AND contact.job_title IS NOT NULL
            ))::text AS missing_contact_fields,
           (SELECT count(*) FROM signals WHERE opportunity_score IS NULL OR opportunity_score < 45)::text AS low_confidence_leads,
           (SELECT count(*) FROM signals signal WHERE NOT EXISTS (
              SELECT 1 FROM signal_evidence evidence
              WHERE evidence.signal_id=signal.id AND evidence.url ~* '^https?://'
            ))::text AS missing_or_broken_evidence,
           (SELECT count(*) FROM signal_corrections WHERE reviewed_at IS NULL)::text AS corrections_waiting_review`,
      ),
    ]);

  const summaryRow = summary.rows[0];
  const totalSignals = Number(summaryRow.total_signals);
  const approvedSignals = Number(summaryRow.approved_signals);

  return {
    summary: {
      totalSignals,
      approvalRate: totalSignals === 0 ? 0 : Math.round((approvedSignals / totalSignals) * 100),
      totalAccounts: Number(summaryRow.total_accounts),
      openPipelineValue: Number(summaryRow.open_pipeline_value),
      wonRevenue: Number(summaryRow.won_revenue),
    },
    signalStatuses: orderBreakdown(signalStatuses.rows, SIGNAL_STATUS_ORDER),
    signalCategories: signalCategories.rows.map((row) => ({
      label: titleCase(row.label),
      count: Number(row.count),
    })),
    pipelineStages: orderBreakdown(pipelineStages.rows, PIPELINE_STAGE_ORDER),
    taskHealth: orderBreakdown(taskHealth.rows, TASK_HEALTH_ORDER),
    weeklyTrend: weeklyTrend.rows.map((row) => ({
      label: row.week_start,
      imported: Number(row.imported),
      approved: Number(row.approved),
    })),
    sourcePerformance: sourcePerformance.rows.map((row)=>{const imported=Number(row.imported);const approved=Number(row.approved);return{source:row.source,imported,approved,approvalRate:imported?Math.round(approved/imported*100):0,pipelineValue:Number(row.pipeline_value)};}),
    reviewerPerformance: reviewerPerformance.rows.map((row)=>{const reviewed=Number(row.reviewed);const approved=Number(row.approved);return{reviewer:row.reviewer,reviewed,approved,approvalRate:reviewed?Math.round(approved/reviewed*100):0};}),
    dataQuality: {
      missingCompanyFields: Number(dataQuality.rows[0].missing_company_fields),
      missingContactFields: Number(dataQuality.rows[0].missing_contact_fields),
      lowConfidenceLeads: Number(dataQuality.rows[0].low_confidence_leads),
      missingOrBrokenEvidence: Number(dataQuality.rows[0].missing_or_broken_evidence),
      correctionsWaitingReview: Number(dataQuality.rows[0].corrections_waiting_review),
    },
    generatedAt: new Date().toISOString(),
  };
}
