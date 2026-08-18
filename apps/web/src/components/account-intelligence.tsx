import { ArrowSquareOut, CalendarBlank, ChartLineUp, CheckCircle, CurrencyDollar, Globe, Lightning, NewspaperClipping, Target, UserCircle } from "@phosphor-icons/react/dist/ssr";

import type { AccountIntelligenceDTO } from "@/types/account";
import { OutreachDrafts } from "@/components/outreach-drafts";
import { AccountTasks } from "@/components/account-tasks";
import { AccountRelationships } from "@/components/account-relationships";
import { LifecycleControl } from "@/components/lifecycle-control";
import { NextBestActions } from "@/components/next-best-actions";
import { LifecyclePill } from "@/components/lifecycle-pill";
import { SalesActivityLogger } from "@/components/sales-activity-logger";
import { AiLeadBrief } from "@/components/ai-lead-brief";

function money(value: number | null) {
  if (value === null) return "Not set";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function date(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function AccountIntelligence({ account, canEdit }: { account: AccountIntelligenceDTO; canEdit: boolean }) {
  const pipelineValue = account.opportunities.filter((item) => item.stage !== "lost").reduce((sum, item) => sum + (item.amountUsd ?? 0), 0);
  const weightedPipeline = account.opportunities.filter((item) => item.stage !== "lost").reduce((sum, item) => sum + (item.amountUsd ?? 0) * (item.probability ?? 0) / 100, 0);
  const reportedInvestment = account.signals.reduce((largest, signal) => Math.max(largest, signal.investmentUsdMillions ?? 0), 0) * 1_000_000;
  const estimatedCoolingSpend = reportedInvestment * 0.08;
  const reportedCapacity = account.signals.reduce((largest, signal) => Math.max(largest, signal.powerCapacityMw ?? 0), 0);
  const highSignals = account.signals.filter((signal) => (signal.score ?? 0) >= 75).length;

  return (
    <div className="account-intelligence">
      <section className="account-hero">
        <div className="account-identity"><span><Globe size={28} weight="duotone" /></span><div><p>Commercial account</p><h2>{account.company.name}</h2><small>{account.company.website ?? "Website not recorded"} · {account.company.countryCode ?? "Market not recorded"}</small></div></div>
        <div className="account-owner"><UserCircle size={21} /><span>Account owner<strong>{account.ownerEmail}</strong></span></div>
        <LifecycleControl accountId={account.id} initialStage={account.lifecycleStage} canEdit={canEdit} />
      </section>

      <section className="intelligence-metrics" aria-label="Account metrics">
        <div><span><Lightning size={20} /></span><p>Signals<strong>{account.signals.length}</strong><small>{highSignals} high opportunity</small></p></div>
        <div><span><Target size={20} /></span><p>Opportunities<strong>{account.opportunities.length}</strong><small>Across all stages</small></p></div>
        <div><span><CurrencyDollar size={20} /></span><p>Pipeline value<strong>{money(pipelineValue)}</strong><small>Excludes lost</small></p></div>
        <div><span><CalendarBlank size={20} /></span><p>Account since<strong>{date(account.createdAt)}</strong><small>Human approved</small></p></div>
      </section>

      {account.signals.length ? <section className="signal-lifecycle-strip" aria-label="Signal lifecycle stages">{account.signals.map((signal) => <div key={signal.id}><span>{signal.title}</span><LifecyclePill stage={signal.lifecycleStage} /></div>)}</section> : null}

      <section className="intelligence-panel commercial-calculator" aria-labelledby="commercial-estimate-title">
        <header><div><p>Commercial qualification</p><h3 id="commercial-estimate-title">Opportunity value model</h3></div><span>Decision support</span></header>
        <div className="commercial-calculator-grid">
          <div><small>Reported project investment</small><strong>{reportedInvestment ? money(reportedInvestment) : "Not reported"}</strong><span>Retained from source evidence</span></div>
          <div><small>Estimated cooling scope</small><strong>{reportedInvestment ? money(estimatedCoolingSpend) : "Needs investment data"}</strong><span>Planning assumption: 8% of project investment</span></div>
          <div><small>Reported power capacity</small><strong>{reportedCapacity ? `${reportedCapacity.toLocaleString("en-US")} MW` : "Not reported"}</strong><span>Retained from source evidence</span></div>
          <div><small>Probability-weighted pipeline</small><strong>{money(weightedPipeline)}</strong><span>Opportunity value × probability</span></div>
        </div>
        <footer>Estimates support prioritization and must be validated by sales engineering before external use.</footer>
      </section>

      <div className="intelligence-layout">
        <section className="intelligence-panel signals-panel"><header><div><p>Market intelligence</p><h3>Signals and evidence</h3></div><span>{account.signals.length}</span></header>{account.signals.length ? <div className="intelligence-signal-list">{account.signals.map((signal) => <article key={signal.id} className={signal.id === account.originatingSignalId ? "originating" : ""}><div className="intelligence-signal-heading"><span><Lightning size={18} /></span><div><h4>{signal.title}</h4><p>{label(signal.category)} · {date(signal.occurredAt)}</p></div><b>{signal.score ?? "–"}</b></div><p>{signal.summary}</p>{signal.explanation ? <div className="intelligence-explanation"><ChartLineUp size={17} /><span>{signal.explanation}</span></div> : null}{signal.evidence.length ? <div className="intelligence-evidence">{signal.evidence.map((evidence) => evidence.url.startsWith("demo:") ? <span className="internal-evidence" key={evidence.url}><NewspaperClipping size={14} />Curated internal scenario</span> : <a href={evidence.url} target="_blank" rel="noreferrer" key={evidence.url}>{evidence.title}<ArrowSquareOut size={14} /></a>)}</div> : null}</article>)}</div> : <p className="panel-empty">No related signals are available.</p>}</section>

        <aside className="intelligence-side">
          <section className="intelligence-panel"><header><div><p>Commercial pipeline</p><h3>Opportunities</h3></div><span>{account.opportunities.length}</span></header>{account.opportunities.length ? <div className="account-opportunity-list">{account.opportunities.map((opportunity) => <article key={opportunity.id}><div><strong>{opportunity.name}</strong><span className={`stage-pill ${opportunity.stage}`}>{label(opportunity.stage)}</span></div><dl><div><dt>Value</dt><dd>{money(opportunity.amountUsd)}</dd></div><div><dt>Probability</dt><dd>{opportunity.probability === null ? "Not set" : `${opportunity.probability}%`}</dd></div><div><dt>Expected close</dt><dd>{date(opportunity.expectedCloseDate)}</dd></div></dl></article>)}</div> : <p className="panel-empty">No opportunities have been created.</p>}</section>
          <section className="intelligence-panel"><header><div><p>Audit trail</p><h3>Recent activity</h3></div><span>{account.activities.length}</span></header>{account.activities.length ? <ol className="activity-list">{account.activities.map((activity) => <li key={activity.id}><CheckCircle size={17} /><div><strong>{label(activity.eventType)}</strong><span>{activity.actorEmail}</span><small>{date(activity.occurredAt)}</small></div></li>)}</ol> : <p className="panel-empty">Activity events will appear here as work progresses.</p>}</section>
        </aside>
      </div>
      <NextBestActions account={account} />
      <AiLeadBrief account={account} />
      <OutreachDrafts accountId={account.id} initialDrafts={account.outreachDrafts} contacts={account.contacts} />
      {canEdit ? <SalesActivityLogger accountId={account.id} /> : null}
      <AccountTasks accountId={account.id} tasks={account.tasks} />
      <AccountRelationships accountId={account.id} initialContacts={account.contacts} initialNotes={account.notes} canEdit={canEdit} />
    </div>
  );
}
