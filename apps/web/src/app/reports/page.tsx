import { connection } from "next/server";

import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { AppShell } from "@/components/app-shell";
import { getAnalyticsReport } from "@/data/analytics";
import type { AnalyticsReportDTO } from "@/types/analytics";

export default async function ReportsPage() {
  await connection();
  let report: AnalyticsReportDTO | undefined;
  let loadError: string | undefined;

  try {
    report = await getAnalyticsReport();
  } catch (error) {
    console.error("Failed to load analytics", error);
    loadError = "Connect PostgreSQL and verify DATABASE_URL, then refresh the page.";
  }

  return (
    <AppShell activeItem="Reports" title="Reports" subtitle="Live signal, pipeline, and execution analytics">
      <AnalyticsDashboard report={report} loadError={loadError} />
    </AppShell>
  );
}
