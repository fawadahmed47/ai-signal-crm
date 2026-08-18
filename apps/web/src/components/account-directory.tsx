import { ArrowRight, Buildings, CurrencyDollar, Globe, Target, X } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { AccountListDTO } from "@/types/account";
import { LifecyclePill } from "@/components/lifecycle-pill";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function AccountDirectory({ accounts, loadError }: { accounts: AccountListDTO[]; loadError?: string }) {
  if (loadError) return <section className="account-empty error"><X size={42} /><h2>Accounts unavailable</h2><p>{loadError}</p></section>;
  if (!accounts.length) return <section className="account-empty"><Buildings size={44} weight="duotone" /><h2>No approved accounts yet</h2><p>Approve a matched signal to create the first account intelligence profile.</p><Link className="button button-primary" href="/">Review signals</Link></section>;

  return (
    <section className="account-directory">
      <header><div><p>Account portfolio</p><h2>Approved companies</h2></div><span>{accounts.length} accounts</span></header>
      <div className="account-grid">
        {accounts.map((account) => (
          <Link className="account-directory-card" href={`/accounts/${account.id}`} key={account.id}>
            <div className="account-card-title"><span><Buildings size={22} weight="duotone" /></span><div><h3>{account.companyName}</h3><p>{account.ownerEmail}</p></div><ArrowRight size={19} /></div>
            <dl>
              <div><dt><Target size={16} /> Opportunities</dt><dd>{account.opportunityCount}</dd></div>
              <div><dt><CurrencyDollar size={16} /> Pipeline</dt><dd>{money(account.pipelineValue)}</dd></div>
              <div><dt><Globe size={16} /> Market</dt><dd>{account.countryCode ?? "Not set"}</dd></div>
            </dl>
            <footer><LifecyclePill stage={account.lifecycleStage} /><span>Open intelligence <ArrowRight size={14} /></span></footer>
          </Link>
        ))}
      </div>
    </section>
  );
}
