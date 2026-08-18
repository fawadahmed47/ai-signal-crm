import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { AppShell } from "@/components/app-shell";
import { FilteredCsvExport } from "@/components/filtered-csv-export";
import { getAnalyticsReport } from "@/data/analytics";
import { getNavigationCounts } from "@/data/dashboard";
import type { NavigationCounts } from "@/data/dashboard";
import { getUserSession } from "@/data/auth-session";
import type { AnalyticsReportDTO } from "@/types/analytics";

export default async function ReportsPage() {
  await connection();
  const session = await getUserSession();
  if (!session) redirect("/login");
  let report: AnalyticsReportDTO | undefined;
  let loadError: string | undefined;
  let navigationCounts: NavigationCounts | undefined;

  try {
    [report, navigationCounts] = await Promise.all([getAnalyticsReport(), getNavigationCounts()]);
  } catch (error) {
    console.error("Failed to load analytics", error);
    loadError = "Connect PostgreSQL and verify DATABASE_URL, then refresh the page.";
  }

  return (
    <AppShell activeItem="Reports" title="Reports" subtitle="Live signal, pipeline, and execution analytics" navigationCounts={navigationCounts} session={session}>
      <AnalyticsDashboard report={report} loadError={loadError} />
      {session.role === "manager" ? <FilteredCsvExport /> : null}
    </AppShell>
  );
}
