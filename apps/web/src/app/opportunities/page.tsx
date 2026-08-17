import { connection } from "next/server";

import { AppShell } from "@/components/app-shell";
import { OpportunityWorkspace } from "@/components/opportunity-workspace";
import { getOpportunityWorkspace } from "@/data/opportunities";
import type { OpportunityAccountDTO, OpportunityDTO } from "@/types/opportunity";

export default async function OpportunitiesPage() {
  await connection();
  let opportunities: OpportunityDTO[] = [];
  let accounts: OpportunityAccountDTO[] = [];
  let loadError: string | undefined;

  try {
    ({ opportunities, accounts } = await getOpportunityWorkspace());
  } catch (error) {
    console.error("Failed to load opportunities", error);
    loadError = "Connect PostgreSQL and verify DATABASE_URL, then refresh the page.";
  }

  return (
    <AppShell
      activeItem="Opportunities"
      title="Opportunities"
      subtitle="Create and progress commercial opportunities"
    >
      <OpportunityWorkspace
        initialOpportunities={opportunities}
        accounts={accounts}
        loadError={loadError}
      />
    </AppShell>
  );
}
