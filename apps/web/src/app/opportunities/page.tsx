import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { OpportunityWorkspace } from "@/components/opportunity-workspace";
import { getOpportunityWorkspace } from "@/data/opportunities";
import { getNavigationCounts } from "@/data/dashboard";
import type { NavigationCounts } from "@/data/dashboard";
import { getUserSession } from "@/data/auth-session";
import type { OpportunityAccountDTO, OpportunityDTO } from "@/types/opportunity";

export default async function OpportunitiesPage() {
  await connection();
  const session = await getUserSession();
  if (!session) redirect("/login");
  let opportunities: OpportunityDTO[] = [];
  let accounts: OpportunityAccountDTO[] = [];
  let loadError: string | undefined;
  let navigationCounts: NavigationCounts | undefined;

  try {
    const data = await Promise.all([getOpportunityWorkspace(), getNavigationCounts()]);
    ({ opportunities, accounts } = data[0]);
    navigationCounts = data[1];
  } catch (error) {
    console.error("Failed to load opportunities", error);
    loadError = "Connect PostgreSQL and verify DATABASE_URL, then refresh the page.";
  }

  return (
    <AppShell
      activeItem="Opportunities"
      title="Opportunities"
      subtitle="Create and progress commercial opportunities"
      navigationCounts={navigationCounts}
      session={session}
    >
      <OpportunityWorkspace
        initialOpportunities={opportunities}
        accounts={accounts}
        loadError={loadError}
      />
    </AppShell>
  );
}
