import { ArrowRight, CalendarPlus, EnvelopeSimple, Phone, Target } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { AccountIntelligenceDTO } from "@/types/account";

export function NextBestActions({ account }: { account: AccountIntelligenceDTO }) {
  const callableContact = account.contacts.find((contact) => contact.phone);
  const hasDraft = account.outreachDrafts.length > 0;
  const hasFollowUp = account.tasks.some((task) => task.status === "open" || task.status === "in_progress");
  const hasOpportunity = account.opportunities.length > 0;
  const actions = [
    { title: "Call procurement contact", detail: callableContact ? `${callableContact.fullName} · ${callableContact.phone}` : "Add a contact and direct phone number", status: callableContact ? "Ready" : "Needs contact", href: "#account-relationships", icon: Phone },
    { title: "Send outreach draft", detail: hasDraft ? "A reviewed draft is ready to copy" : "Generate an evidence-grounded draft", status: hasDraft ? "Ready" : "Prepare", href: "#outreach", icon: EnvelopeSimple },
    { title: "Follow up in 3 days", detail: hasFollowUp ? "An open follow-up task is assigned" : "Create a dated follow-up task", status: hasFollowUp ? "Scheduled" : "Schedule", href: "#tasks", icon: CalendarPlus },
    { title: "Create opportunity", detail: hasOpportunity ? `${account.opportunities.length} opportunity record${account.opportunities.length === 1 ? "" : "s"} linked` : "Convert the accepted account into pipeline", status: hasOpportunity ? "Complete" : "Create", href: `/opportunities?account=${account.id}`, icon: Target },
  ];

  return (
    <section className="intelligence-panel next-best-actions" aria-labelledby="next-best-action-title">
      <header><div><p>Sales guidance</p><h3 id="next-best-action-title">Next best action</h3></div><span>{actions.filter((action) => ["Ready", "Schedule", "Create"].includes(action.status)).length} ready</span></header>
      <div className="next-action-grid">
        {actions.map(({ title, detail, status, href, icon: Icon }) => (
          <Link href={href} key={title} className="next-action-card"><span><Icon size={21} weight="duotone" /></span><div><strong>{title}</strong><small>{detail}</small></div><em>{status}</em><ArrowRight size={16} /></Link>
        ))}
      </div>
    </section>
  );
}
