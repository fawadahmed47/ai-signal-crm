import "server-only";

import { getDatabasePool } from "@/data/db";

export type NavigationCounts = {
  allSignals: number;
  highOpportunity: number;
  accounts: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type IngestionSourceStatus = {
  name: string;
  sourceType: string;
  sourceUrl: string | null;
  lastImportedAt: string | null;
  totalSignals: number;
  pendingSignals: number;
};

type CountRow = {
  all_signals: number;
  high_opportunity: number;
  accounts: number;
  pending: number;
  approved: number;
  rejected: number;
};

type SourceRow = {
  name: string;
  source_type: string;
  source_url: string | null;
  last_imported_at: Date | null;
  total_signals: number;
  pending_signals: number;
};

export async function getNavigationCounts(): Promise<NavigationCounts> {
  const result = await getDatabasePool().query<CountRow>(
    `SELECT
       (SELECT count(*)::int FROM signals) AS all_signals,
       (SELECT count(*)::int FROM signals WHERE opportunity_score >= 75) AS high_opportunity,
       (SELECT count(*)::int FROM accounts) AS accounts,
       (SELECT count(*)::int FROM signals WHERE status = 'pending') AS pending,
       (SELECT count(*)::int FROM signals WHERE status = 'approved') AS approved,
       (SELECT count(*)::int FROM signals WHERE status = 'rejected') AS rejected`,
  );
  const row = result.rows[0];
  return {
    allSignals: row.all_signals,
    highOpportunity: row.high_opportunity,
    accounts: row.accounts,
    pending: row.pending,
    approved: row.approved,
    rejected: row.rejected,
  };
}

export async function getIngestionSourceStatuses(): Promise<IngestionSourceStatus[]> {
  const result = await getDatabasePool().query<SourceRow>(
    `SELECT
       ss.name,
       ss.source_type,
       ss.source_url,
       max(s.imported_at) AS last_imported_at,
       count(s.id)::int AS total_signals,
       count(s.id) FILTER (WHERE s.status = 'pending')::int AS pending_signals
     FROM signal_sources ss
     LEFT JOIN signals s ON s.source_id = ss.id
     GROUP BY ss.id, ss.name, ss.source_type, ss.source_url
     ORDER BY max(s.imported_at) DESC NULLS LAST, ss.name`,
  );
  return result.rows.map((row) => ({
    name: row.name,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    lastImportedAt: row.last_imported_at?.toISOString() ?? null,
    totalSignals: row.total_signals,
    pendingSignals: row.pending_signals,
  }));
}
