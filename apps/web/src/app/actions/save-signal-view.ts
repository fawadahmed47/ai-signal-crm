"use server";

import { revalidatePath } from "next/cache";

import { getUserSession } from "@/data/auth-session";
import { getDatabasePool } from "@/data/db";
import type { SignalViewFilters } from "@/data/saved-views";

export async function saveSignalViewAction(nameValue: string, filters: SignalViewFilters) {
  const session = await getUserSession();
  if (!session) return { ok: false as const, message: "Sign in to save a view." };
  const name = nameValue.trim();
  if (name.length < 2 || name.length > 80) return { ok: false as const, message: "View name must be 2–80 characters." };
  const safeFilters: SignalViewFilters = {
    search: filters.search.slice(0, 120), category: filters.category.slice(0, 80),
    minScore: Math.max(0, Math.min(100, Number(filters.minScore) || 0)),
    minInvestment: Math.max(0, Number(filters.minInvestment) || 0),
  };
  await getDatabasePool().query(
    `INSERT INTO saved_signal_views (user_id,name,filters) VALUES ($1,$2,$3::jsonb)
     ON CONFLICT (user_id,name) DO UPDATE SET filters=EXCLUDED.filters,updated_at=now()`,
    [session.userId, name, JSON.stringify(safeFilters)],
  );
  revalidatePath("/");
  return { ok: true as const, message: "Saved view updated." };
}
