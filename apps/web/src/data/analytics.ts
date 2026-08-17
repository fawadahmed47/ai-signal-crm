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
  const [summary, signalStatuses, signalCategories, pipelineStages, taskHealth, weeklyTrend] =
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
    generatedAt: new Date().toISOString(),
  };
}
