import { AppShell } from "@/components/app-shell";
import { SignalInbox } from "@/components/signal-inbox";

export default function Home() {
  return (
    <AppShell title="Signal Inbox" subtitle="AI-detected signals from the market" contentClassName="signal-workspace-content">
      <SignalInbox />
    </AppShell>
  );
}
