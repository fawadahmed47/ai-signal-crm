import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { GtmWorkspace } from "@/components/gtm-workspace";
import { getUserSession } from "@/data/auth-session";
import { getNavigationCounts } from "@/data/dashboard";
import { getGtmWorkspace } from "@/data/gtm-workspace";
import type { GtmWorkspaceDTO } from "@/types/gtm";
import type { NavigationCounts } from "@/data/dashboard";

export default async function GtmWorkspacePage() {
  await connection();
  const session = await getUserSession();
  if (!session) redirect("/login");
  let workspace: GtmWorkspaceDTO | undefined;
  let navigationCounts: NavigationCounts | undefined;
  let loadError = false;
  try {
    [workspace, navigationCounts] = await Promise.all([getGtmWorkspace(), getNavigationCounts()]);
  } catch (error) {
    console.error("Failed to load GTM workspace", error);
    loadError = true;
  }
  return <AppShell activeItem="GTM Hub" title="AI GTM Hub" subtitle="Campaign activation, lead routing, and enrichment operations" navigationCounts={navigationCounts} session={session}>{loadError || !workspace ? <section className="account-empty error"><h2>GTM workspace unavailable</h2><p>Connect PostgreSQL and apply the latest migration before refreshing.</p></section> : <GtmWorkspace workspace={workspace} />}</AppShell>;
}
