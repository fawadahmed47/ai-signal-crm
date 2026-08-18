"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { getUserSession } from "@/data/auth-session";
import { getDatabasePool } from "@/data/db";
import type { CommercialLifecycleStage } from "@/types/signal";

const STAGES = new Set<CommercialLifecycleStage>([
  "new",
  "enriched",
  "marketing_qualified",
  "sales_accepted",
  "opportunity",
  "won",
  "lost",
]);

export async function updateAccountLifecycleAction(accountId: string, stage: CommercialLifecycleStage) {
  const session = await getUserSession();
  if (!session || session.role !== "marketer") return { ok: false, message: "Marketer access is required." };
  if (!/^[0-9a-f-]{36}$/i.test(accountId) || !STAGES.has(stage)) return { ok: false, message: "Invalid lifecycle update." };

  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      "UPDATE accounts SET commercial_lifecycle_stage=$2,updated_at=now() WHERE id=$1 RETURNING id",
      [accountId, stage],
    );
    if (!updated.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, message: "Account not found." };
    }
    await client.query(
      "INSERT INTO activity_events(account_id,actor_email,event_type,details) VALUES($1,$2,'lifecycle_updated',$3::jsonb)",
      [accountId, session.email, JSON.stringify({ stage })],
    );
    await client.query("COMMIT");
    revalidatePath(`/accounts/${accountId}`);
    revalidatePath("/accounts");
    revalidatePath("/reports");
    return { ok: true, message: "Lifecycle updated." };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update account lifecycle", error);
    return { ok: false, message: "Lifecycle could not be updated." };
  } finally {
    client.release();
  }
}
