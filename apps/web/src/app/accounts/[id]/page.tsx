import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountIntelligence } from "@/components/account-intelligence";
import { AppShell } from "@/components/app-shell";
import { getAccountIntelligence } from "@/data/accounts";
import { getDemoSession } from "@/data/demo-session";

type AccountPageProps = { params: Promise<{ id: string }> };

export default async function AccountPage({ params }: AccountPageProps) {
  const session = await getDemoSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const account = await getAccountIntelligence(id);
  if (!account) notFound();

  return (
    <AppShell activeItem="Accounts" title={account.company.name} subtitle="Account intelligence" session={session}>
      <Link className="account-back-link" href="/accounts"><ArrowLeft size={16} /> All accounts</Link>
      <AccountIntelligence account={account} />
    </AppShell>
  );
}
