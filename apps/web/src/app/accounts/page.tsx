import { connection } from "next/server";

import { AccountDirectory } from "@/components/account-directory";
import { AppShell } from "@/components/app-shell";
import { getAccounts } from "@/data/accounts";
import type { AccountListDTO } from "@/types/account";

export default async function AccountsPage() {
  await connection();
  let accounts: AccountListDTO[] = [];
  let loadError: string | undefined;
  try {
    accounts = await getAccounts();
  } catch (error) {
    console.error("Failed to load accounts", error);
    loadError = "Connect PostgreSQL and verify DATABASE_URL, then refresh the page.";
  }

  return (
    <AppShell activeItem="Accounts" title="Accounts" subtitle="Commercial intelligence for approved companies">
      <AccountDirectory accounts={accounts} loadError={loadError} />
    </AppShell>
  );
}
