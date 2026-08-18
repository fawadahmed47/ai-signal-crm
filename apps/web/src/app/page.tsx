import { AppShell } from "@/components/app-shell";
import { SignalInbox } from "@/components/signal-inbox";
import { getPendingSignals } from "@/data/signals";
import { getIngestionSourceStatuses, getNavigationCounts } from "@/data/dashboard";
import type { IngestionSourceStatus, NavigationCounts } from "@/data/dashboard";
import type { SignalInboxDTO } from "@/types/signal";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getUserSession } from "@/data/auth-session";
import { getSavedSignalViews } from "@/data/saved-views";
import type { SavedSignalView } from "@/data/saved-views";

export default async function Home() {
  await connection();
  const session = await getUserSession();
  if (!session) redirect("/login");
  let signals: SignalInboxDTO[] = [];
  let loadError: string | undefined;
  let navigationCounts: NavigationCounts | undefined;
  let sources: IngestionSourceStatus[] = [];
  let savedViews: SavedSignalView[] = [];
  try {
    [signals, navigationCounts, sources, savedViews] = await Promise.all([getPendingSignals(), getNavigationCounts(), getIngestionSourceStatuses(), getSavedSignalViews(session.userId)]);
  } catch (error) {
    console.error("Failed to load pending signals", error);
    loadError = "Connect PostgreSQL and verify DATABASE_URL, then refresh the page.";
  }

  return (
    <AppShell title="Signal Inbox" subtitle="AI-detected signals from the market" contentClassName="signal-workspace-content" navigationCounts={navigationCounts} session={session}>
      <SignalInbox initialSignals={signals} loadError={loadError} sources={sources} canReview={session.role === "marketer"} initialSavedViews={savedViews} />
    </AppShell>
  );
}
