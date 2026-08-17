import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountIntelligence } from "@/components/account-intelligence";
import { AppShell } from "@/components/app-shell";
import { getAccountIntelligence } from "@/data/accounts";

type AccountPageProps = { params: Promise<{ id: string }> };

export default async function AccountPage({ params }: AccountPageProps) {
  const { id } = await params;
  const account = await getAccountIntelligence(id);
  if (!account) notFound();

  return (
    <AppShell activeItem="Accounts" title={account.company.name} subtitle="Account intelligence">
      <Link className="account-back-link" href="/accounts"><ArrowLeft size={16} /> All accounts</Link>
      <AccountIntelligence account={account} />
    </AppShell>
  );
}
