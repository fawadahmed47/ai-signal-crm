"use server";

import { revalidatePath } from "next/cache";

import { getDemoSession } from "@/data/demo-session";
import { getDatabasePool } from "@/data/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeCompanyName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function assignSignalCompanyAction(signalId: string, companyName: string) {
  const session = await getDemoSession();
  if (session?.role === "manager") return { ok: false as const, message: "Manager access is read-only. Sign in as a marketer to correct signal data." };
  const name = companyName.trim();
  const normalizedName = normalizeCompanyName(name);
  if (!UUID_PATTERN.test(signalId) || name.length < 2 || name.length > 180 || !normalizedName) return { ok: false as const, message: "Enter a valid company name before confirming the match." };
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const signal = await client.query<{ id: string }>("SELECT id::text FROM signals WHERE id=$1 AND status='pending' FOR UPDATE", [signalId]);
    if (!signal.rowCount) { await client.query("ROLLBACK"); return { ok: false as const, message: "Only pending signals can be corrected." }; }
    const company = await client.query<{ id: string }>(`INSERT INTO companies (canonical_name, normalized_name) VALUES ($1,$2) ON CONFLICT (normalized_name) DO UPDATE SET canonical_name=EXCLUDED.canonical_name RETURNING id::text`, [name, normalizedName]);
    await client.query("UPDATE signals SET company_id=$2, updated_at=now() WHERE id=$1", [signalId, company.rows[0].id]);
    await client.query("COMMIT");
    revalidatePath("/");
    return { ok: true as const, companyName: name, message: "Company match saved. You can now approve this signal." };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
    console.error("Failed to assign company", error);
    return { ok: false as const, message: "The company correction could not be saved." };
  } finally { client.release(); }
}
