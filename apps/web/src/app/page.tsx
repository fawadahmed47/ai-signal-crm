import { AppShell } from "@/components/app-shell";
import { SignalInbox } from "@/components/signal-inbox";
import { getPendingSignals } from "@/data/signals";
import type { SignalInboxDTO } from "@/types/signal";
import { connection } from "next/server";

export default async function Home() {
  await connection();
  let signals: SignalInboxDTO[] = [];
  let loadError: string | undefined;
  try {
    signals = await getPendingSignals();
  } catch (error) {
    console.error("Failed to load pending signals", error);
    loadError = "Connect PostgreSQL and verify DATABASE_URL, then refresh the page.";
  }

  return (
    <AppShell title="Signal Inbox" subtitle="AI-detected signals from the market" contentClassName="signal-workspace-content">
      <SignalInbox initialSignals={signals} loadError={loadError} />
    </AppShell>
  );
}
