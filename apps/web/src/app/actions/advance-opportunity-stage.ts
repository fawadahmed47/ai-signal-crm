"use server";

import { revalidatePath } from "next/cache";

import { getUserSession } from "@/data/auth-session";
import { getDatabasePool } from "@/data/db";
import { OPPORTUNITY_STAGES } from "@/data/opportunity-core";
import type { OpportunityStage } from "@/types/opportunity";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function advanceOpportunityStageAction(opportunityId: string, stage: OpportunityStage) {
  const session = await getUserSession();
  if (!session || session.role !== "marketer") return { ok: false as const, message: "Marketer access is required." };
  if (!UUID_PATTERN.test(opportunityId) || !OPPORTUNITY_STAGES.includes(stage)) return { ok: false as const, message: "Invalid pipeline stage." };

  const pool = getDatabasePool();
  const updated = await pool.query<{ account_id: string }>(
    `UPDATE opportunities
     SET stage=$2, updated_at=now()
     WHERE id=$1
     RETURNING account_id::text`,
    [opportunityId, stage],
  );
  if (!updated.rowCount) return { ok: false as const, message: "Opportunity not found." };

  await pool.query(
    "INSERT INTO activity_events (account_id,actor_email,event_type,details) VALUES ($1,$2,'opportunity_stage_updated',jsonb_build_object('opportunityId',$3::text,'stage',$4::text))",
    [updated.rows[0].account_id, session.email, opportunityId, stage],
  );
  revalidatePath("/opportunities");
  revalidatePath(`/accounts/${updated.rows[0].account_id}`);
  revalidatePath("/sales-workspace");
  return { ok: true as const, message: `Moved to ${stage}.` };
}
