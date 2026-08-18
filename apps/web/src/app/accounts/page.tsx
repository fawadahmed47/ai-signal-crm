import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AccountDirectory } from "@/components/account-directory";
import { AppShell } from "@/components/app-shell";
import { getAccounts } from "@/data/accounts";
import { getNavigationCounts } from "@/data/dashboard";
import type { NavigationCounts } from "@/data/dashboard";
import { getUserSession } from "@/data/auth-session";
import type { AccountListDTO } from "@/types/account";

export default async function AccountsPage() {
  await connection();
  const session = await getUserSession();
  if (!session) redirect("/login");
  let accounts: AccountListDTO[] = [];
  let loadError: string | undefined;
  let navigationCounts: NavigationCounts | undefined;
  try {
    [accounts, navigationCounts] = await Promise.all([getAccounts(), getNavigationCounts()]);
  } catch (error) {
    console.error("Failed to load accounts", error);
    loadError = "Connect PostgreSQL and verify DATABASE_URL, then refresh the page.";
  }

  return (
    <AppShell activeItem="Accounts" title="Accounts" subtitle="Commercial intelligence for approved companies" navigationCounts={navigationCounts} session={session}>
      <AccountDirectory accounts={accounts} loadError={loadError} />
    </AppShell>
  );
}
