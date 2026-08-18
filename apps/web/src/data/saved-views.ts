import "server-only";

import { getDatabasePool } from "@/data/db";

export type SignalViewFilters = { search: string; category: string; minScore: number; minInvestment: number };
export type SavedSignalView = { id: string; name: string; filters: SignalViewFilters };

export async function getSavedSignalViews(userId: string): Promise<SavedSignalView[]> {
  const result = await getDatabasePool().query<{ id: string; name: string; filters: SignalViewFilters }>(
    "SELECT id::text,name,filters FROM saved_signal_views WHERE user_id=$1 ORDER BY name", [userId],
  );
  return result.rows;
}
