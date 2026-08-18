import "server-only";

import { getDatabasePool } from "@/data/db";
import { saveOpportunity, type SaveOpportunityInput } from "@/data/opportunity-core";
import type { OpportunityAccountDTO, OpportunityDTO } from "@/types/opportunity";

type OpportunityRow = {
  id: string;
  account_id: string;
  account_name: string;
  name: string;
  stage: OpportunityDTO["stage"];
  amount_usd: string | null;
  probability: number | null;
  owner_email: string;
  expected_close_date: string | null;
  updated_at: Date;
};

export async function getOpportunityWorkspace(): Promise<{
  opportunities: OpportunityDTO[];
  accounts: OpportunityAccountDTO[];
}> {
  const pool = getDatabasePool();
  const [opportunities, accounts] = await Promise.all([
    pool.query<OpportunityRow>(
      `SELECT o.id::text, o.account_id::text, c.canonical_name AS account_name,
              o.name, o.stage, o.amount_usd, o.probability, o.owner_email,
              o.expected_close_date::text, o.updated_at
       FROM opportunities o
       JOIN accounts a ON a.id = o.account_id
       JOIN companies c ON c.id = a.company_id
       ORDER BY o.updated_at DESC, o.created_at DESC`,
    ),
    pool.query<{ id: string; company_name: string }>(
      `SELECT a.id::text, c.canonical_name AS company_name
       FROM accounts a
       JOIN companies c ON c.id = a.company_id
       ORDER BY c.canonical_name`,
    ),
  ]);

  return {
    opportunities: opportunities.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      accountName: row.account_name,
      name: row.name,
      stage: row.stage,
      amountUsd: row.amount_usd === null ? null : Number(row.amount_usd),
      probability: row.probability,
      ownerEmail: row.owner_email,
      expectedCloseDate: row.expected_close_date,
      updatedAt: row.updated_at.toISOString(),
      weightedValue: (row.amount_usd === null ? 0 : Number(row.amount_usd)) * (row.probability ?? 0) / 100,
    })),
    accounts: accounts.rows.map((row) => ({ id: row.id, companyName: row.company_name })),
  };
}

export async function persistOpportunity(input: SaveOpportunityInput, ownerEmail: string) {
  return saveOpportunity(getDatabasePool(), input, ownerEmail);
}
