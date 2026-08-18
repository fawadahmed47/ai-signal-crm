"use server";

import { revalidatePath } from "next/cache";

import { getUserSession } from "@/data/auth-session";
import { getDatabasePool } from "@/data/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORIES = new Set(["construction", "expansion", "investment", "other", "ai infrastructure", "capacity expansion", "product launch", "market research"]);

function optionalNumber(value: string, label: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} must be a positive number.`);
  return number;
}

export async function correctSignalAction(value: { signalId: string; location: string; category: string; powerCapacityMw: string; investmentUsdMillions: string; reason: string }) {
  const session = await getUserSession();
  if (!session || session.role !== "marketer") return { ok: false as const, message: "Marketer access is required to correct signal facts." };
  if (!UUID_PATTERN.test(value.signalId)) return { ok: false as const, message: "A valid signal is required." };
  const location = value.location.trim() || null;
  const category = value.category.trim().toLowerCase();
  const reason = value.reason.trim();
  if (!CATEGORIES.has(category)) return { ok: false as const, message: "Select a supported signal category." };
  if (location && location.length > 300) return { ok: false as const, message: "Location is too long." };
  if (reason.length < 3 || reason.length > 500) return { ok: false as const, message: "Add a short correction reason." };
  try {
    const power = optionalNumber(value.powerCapacityMw, "Power capacity");
    const investment = optionalNumber(value.investmentUsdMillions, "Investment");
    const client = await getDatabasePool().connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{ location_text: string | null; category: string; power_capacity_mw: string | null; investment_usd_millions: string | null }>(
        "SELECT location_text,category,power_capacity_mw::text,investment_usd_millions::text FROM signals WHERE id=$1 AND status='pending' FOR UPDATE", [value.signalId],
      );
      if (!current.rowCount) { await client.query("ROLLBACK"); return { ok: false as const, message: "Only pending signals can be corrected." }; }
      const old = current.rows[0];
      const changes: Array<[string, string | null, string | null]> = [
        ["location", old.location_text, location], ["category", old.category, category],
        ["power_capacity_mw", old.power_capacity_mw, power?.toString() ?? null],
        ["investment_usd_millions", old.investment_usd_millions, investment?.toString() ?? null],
      ];
      await client.query("UPDATE signals SET location_text=$2,category=$3,power_capacity_mw=$4,investment_usd_millions=$5,updated_at=now() WHERE id=$1", [value.signalId, location, category, power, investment]);
      for (const [field, oldValue, newValue] of changes) {
        if (oldValue === newValue) continue;
        await client.query("INSERT INTO signal_corrections (signal_id,corrected_by_user_id,field_name,old_value,new_value,reason) VALUES ($1,$2,$3,$4,$5,$6)", [value.signalId, session.userId, field, oldValue, newValue ?? "", reason]);
      }
      await client.query("COMMIT");
      revalidatePath("/");
      return { ok: true as const, message: "Corrected facts saved with an audit trail.", corrected: { location, category, powerCapacityMw: power, investmentUsdMillions: investment } };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Signal corrections could not be saved." };
  }
}
