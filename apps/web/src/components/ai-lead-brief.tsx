import { Brain, CheckCircle, CurrencyDollar, UsersThree } from "@phosphor-icons/react/dist/ssr";

import type { AccountIntelligenceDTO } from "@/types/account";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function AiLeadBrief({ account }: { account: AccountIntelligenceDTO }) {
  const strongest = [...account.signals].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const investment = Math.max(...account.signals.map((signal) => signal.investmentUsdMillions ?? 0), 0);
  const decisionMaker = account.contacts.find((contact) => contact.stakeholderRole === "decision_maker") ?? account.contacts[0];
  const nextAction = account.outreachDrafts.some((draft) => draft.status === "draft") ? "Review and send the evidence-grounded outreach draft." : decisionMaker ? `Contact ${decisionMaker.fullName} to validate timing and decision process.` : "Identify a decision-maker or procurement contact before outreach.";
  const confidence = strongest?.evidence.some((evidence) => evidence.url.startsWith("http")) ? "Evidence retained" : "Evidence needs validation";

  return <section className="ai-lead-brief" aria-labelledby="ai-lead-brief-title"><header><div><p>AI GTM brief</p><h3 id="ai-lead-brief-title"><Brain size={19} weight="duotone" /> Commercial recommendation</h3></div><span>{strongest?.score ?? "—"} lead score</span></header><div className="ai-brief-summary"><strong>Why it matters</strong><p>{strongest ? `${account.company.name} is showing a ${strongest.category.replaceAll("_", " ")} trigger: ${strongest.title}. ${strongest.summary}` : "No reviewed market signal is linked to this account yet."}</p></div><div className="ai-brief-grid"><div><CurrencyDollar size={18} /><span>Commercial potential</span><strong>{investment ? `${money(investment * 1_000_000)} reported investment` : "Value requires validation"}</strong></div><div><UsersThree size={18} /><span>Recommended buyer</span><strong>{decisionMaker ? `${decisionMaker.fullName}${decisionMaker.jobTitle ? ` · ${decisionMaker.jobTitle}` : ""}` : "Procurement / facilities lead"}</strong></div><div><CheckCircle size={18} /><span>Evidence confidence</span><strong>{confidence}</strong></div></div><footer><strong>Recommended next action:</strong> {nextAction}</footer></section>;
}
