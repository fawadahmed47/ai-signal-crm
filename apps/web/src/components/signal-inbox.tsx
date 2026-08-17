"use client";

import {
  ArrowLeft, ArrowRight, ArrowSquareOut, Buildings, CaretDown, Check, CheckCircle, CrownSimple, DotsThree,
  Factory, FunnelSimple, GearSix, Heartbeat, Lightning, NewspaperClipping,
  RocketLaunch, ShieldCheck, Sparkle, X,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

type Signal = {
  id: number; company: string; headline: string; score: number;
  confidence: "High" | "Medium"; type: string; detected: string; age: string;
  icon: typeof RocketLaunch; tone: string; why: string;
};

const initialSignals: Signal[] = [
  { id: 1, company: "Acme Corp", headline: "Announced $120M Series C to scale AI platform", score: 92, confidence: "High", type: "Funding", detected: "15 Aug 2026", age: "2h ago", icon: RocketLaunch, tone: "blue", why: "Acme Corp is raising capital to accelerate go-to-market and expand enterprise sales. Similar companies invest in sales enablement and revenue intelligence during this phase." },
  { id: 2, company: "Northwind Logistics", headline: "New sustainability plan targets 30% emissions reduction", score: 78, confidence: "High", type: "Sustainability", detected: "15 Aug 2026", age: "4h ago", icon: Lightning, tone: "teal", why: "Northwind is modernizing its operations and supplier network, creating an opening for data-led workflow and reporting solutions." },
  { id: 3, company: "Vertex Systems", headline: "Executive hire: VP of Revenue Operations", score: 74, confidence: "Medium", type: "Leadership", detected: "15 Aug 2026", age: "6h ago", icon: Sparkle, tone: "purple", why: "A new revenue operations leader often triggers a review of pipeline quality, forecasting and commercial systems." },
  { id: 4, company: "BluePeak Security", headline: "Expanding into healthcare market", score: 65, confidence: "Medium", type: "Expansion", detected: "15 Aug 2026", age: "8h ago", icon: ShieldCheck, tone: "navy", why: "Entering healthcare creates new compliance and account-planning requirements for the commercial team." },
  { id: 5, company: "Pioneer Industries", headline: "New manufacturing facility opening in Texas", score: 60, confidence: "Medium", type: "Expansion", detected: "15 Aug 2026", age: "10h ago", icon: Factory, tone: "green", why: "A new site introduces new teams, vendors and operational planning needs that can support an expansion conversation." },
  { id: 6, company: "Luminex", headline: "Partnership with AWS announced", score: 58, confidence: "Medium", type: "Partnership", detected: "15 Aug 2026", age: "12h ago", icon: GearSix, tone: "dark", why: "The AWS partnership suggests investment in cloud delivery, joint go-to-market activity and scalable account operations." },
  { id: 7, company: "Cobalt Bank", headline: "Digital transformation initiative launched", score: 54, confidence: "Medium", type: "Technology", detected: "14 Aug 2026", age: "1d ago", icon: Heartbeat, tone: "blue", why: "A formal transformation program creates a defined budget window and executive sponsorship for new systems." },
  { id: 8, company: "Atlas Energy", headline: "Acquired regional solar portfolio", score: 51, confidence: "Medium", type: "Acquisition", detected: "14 Aug 2026", age: "1d ago", icon: Lightning, tone: "green", why: "The acquisition expands Atlas Energy's operating footprint and creates a near-term integration opportunity." },
  { id: 9, company: "Orchid Health", headline: "Opened two new clinical markets", score: 49, confidence: "Medium", type: "Expansion", detected: "14 Aug 2026", age: "1d ago", icon: Heartbeat, tone: "purple", why: "New markets require coordinated account coverage, partner management and commercial planning." },
  { id: 10, company: "Summit Data", headline: "Launched enterprise partner program", score: 46, confidence: "Medium", type: "Partnership", detected: "13 Aug 2026", age: "2d ago", icon: GearSix, tone: "navy", why: "A partner program introduces a new route to market and a need for consistent pipeline operations." },
  { id: 11, company: "Redwood Mobility", headline: "Hiring commercial team across Europe", score: 43, confidence: "Medium", type: "Hiring", detected: "13 Aug 2026", age: "2d ago", icon: RocketLaunch, tone: "teal", why: "Commercial hiring indicates an active growth motion and upcoming investment in sales infrastructure." },
  { id: 12, company: "Keystone Foods", headline: "Modernizing distributor operations", score: 40, confidence: "Medium", type: "Technology", detected: "12 Aug 2026", age: "3d ago", icon: Factory, tone: "dark", why: "Distributor modernization can create demand for better account visibility and execution workflows." },
];

const sources = [
  { title: "Acme Corp raises $120M Series C led by Sequoia", publisher: "TechCrunch" },
  { title: "Acme Corp plans to double sales and customer success headcount", publisher: "Business Wire" },
  { title: "Funding to accelerate AI platform and expand enterprise reach", publisher: "Acme Corp Press Release" },
];

export function SignalInbox() {
  const [signals, setSignals] = useState(initialSignals);
  const [selectedId, setSelectedId] = useState(1);
  const [sort, setSort] = useState<"newest" | "score">("newest");
  const [status, setStatus] = useState<string | null>(null);
  const [owner, setOwner] = useState("Jamie Smith");
  const [destination, setDestination] = useState("Existing opportunity");

  const visibleSignals = useMemo(() => {
    return sort === "score" ? [...signals].sort((a, b) => b.score - a.score) : signals;
  }, [signals, sort]);
  const selected = signals.find((signal) => signal.id === selectedId) ?? visibleSignals[0];

  function resolveSignal(action: "approved" | "dismissed") {
    if (!selected) return;
    const remaining = signals.filter((item) => item.id !== selected.id);
    setSignals(remaining);
    if (remaining[0]) setSelectedId(remaining[0].id);
    setStatus(action === "approved" ? `${selected.company} was approved and added to the opportunity.` : `${selected.company} was dismissed.`);
  }

  if (!selected) return <section className="signal-empty"><CheckCircle size={42} weight="duotone" /><h2>Inbox cleared</h2><p>There are no signals left in this view.</p></section>;
  const SelectedIcon = selected.icon;

  return (
    <div className="signal-inbox">
      {status ? <div className="signal-toast" role="status"><CheckCircle size={20} weight="fill" /><span>{status}</span><button type="button" aria-label="Dismiss notification" onClick={() => setStatus(null)}><X size={16} /></button></div> : null}

      <section className="signal-list-pane" aria-label="Detected signals">
        <div className="signal-list-tools">
          <div className="signal-sort-row">
            <label><span className="sr-only">Sort signals</span><select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "score")}><option value="newest">Sort: Newest</option><option value="score">Sort: Opportunity score</option></select></label>
            <button className="filter-button" type="button" aria-label="Filter signals"><FunnelSimple size={19} /></button>
          </div>
        </div>
        <div className="signal-list" role="listbox" aria-label="Signal results">
          {visibleSignals.map((signal) => {
            const Icon = signal.icon;
            return <button className={`signal-list-card ${signal.id === selected.id ? "selected" : ""}`} key={signal.id} type="button" role="option" aria-selected={signal.id === selected.id} onClick={() => { setSelectedId(signal.id); setStatus(null); }}>
              <span className={`company-mark ${signal.tone}`}><Icon size={24} weight="fill" /></span>
              <span className="signal-card-copy"><strong>{signal.company}</strong><span>{signal.headline}</span></span>
              <span className="signal-card-meta"><small>{signal.age}</small><b className={signal.score >= 80 ? "high" : "medium"}>{signal.score}</b></span>
            </button>;
          })}
        </div>
        <footer className="signal-list-footer"><span>Showing 1–{visibleSignals.length} of {signals.length}</span><span className="list-pagination"><button type="button" aria-label="Previous page" disabled><ArrowLeft size={16} /></button><button type="button" aria-label="Next page"><ArrowRight size={16} /></button></span></footer>
      </section>

      <article className="signal-detail-pane" aria-live="polite">
        <header className="signal-detail-header">
          <div className="signal-detail-topline"><span className="detected-pill"><span /> AI-detected signal</span><span className="signal-age">{selected.age}</span><button className="icon-button" type="button" aria-label="More signal actions"><DotsThree size={22} weight="bold" /></button></div>
          <h2>{selected.company} {selected.headline.charAt(0).toLowerCase() + selected.headline.slice(1)}</h2>
          <div className="signal-metrics">
            <div className="metric"><span>Confidence</span><div><strong>{selected.confidence}</strong><b className="score-ring">{selected.score}</b></div></div>
            <div className="metric"><span>Opportunity score</span><div><strong>{selected.score}</strong><em>{selected.score >= 80 ? "High" : "Medium"}</em></div></div>
            <div className="metric"><span>Signal type</span><div><SelectedIcon size={20} /><strong>{selected.type}</strong></div></div>
            <div className="metric"><span>Detected</span><div><strong>{selected.detected}</strong></div></div>
          </div>
        </header>

        <div className="signal-detail-grid">
          <section className="detail-card why-card"><h3>Why it matters</h3><p>{selected.why}</p></section>
          <section className="detail-card account-card">
            <h3>Account match</h3><div className="account-heading"><span className={`company-mark ${selected.tone}`}><SelectedIcon size={24} weight="fill" /></span><div><strong>{selected.company}</strong><button type="button">Open Account</button></div></div>
            <dl><div><dt>Relationship strength</dt><dd>Strong <span className="strength-dots">● ● ● ●</span></dd></div><div><dt>Last engagement</dt><dd>18 Jul 2026</dd></div><div><dt>Open opportunities</dt><dd>1</dd></div></dl>
          </section>
          <section className="detail-card evidence-card">
            <h3>Source evidence</h3><div className="evidence-list">{sources.map((source) => <a href="#" onClick={(event) => event.preventDefault()} key={source.title}><span className="source-mark"><NewspaperClipping size={16} weight="duotone" /></span><span><strong>{source.title}</strong><small>{source.publisher} · 15 Aug 2026</small></span><ArrowSquareOut size={18} /></a>)}</div>
          </section>
          <section className="detail-card assignment-card">
            <h3>Suggested owner</h3><label className="owner-select"><span className="avatar small">JS</span><span><strong>{owner}</strong><small>Sales Operator</small></span><select aria-label="Suggested owner" value={owner} onChange={(event) => setOwner(event.target.value)}><option>Jamie Smith</option><option>Fawad Ahmed</option><option>Alex Morgan</option></select><CaretDown size={16} /></label>
            <div className="assignment-divider" /><h3>Add to</h3><label className="destination-select"><Buildings size={20} /><select aria-label="Add signal to" value={destination} onChange={(event) => setDestination(event.target.value)}><option>Existing opportunity</option><option>New opportunity</option><option>Account activity</option></select><CaretDown size={16} /></label>
            <div className="opportunity-chip"><CrownSimple size={18} weight="fill" /><span><strong>{selected.company} – Expansion</strong><small>$185,000 · Proposal</small></span><X size={16} /></div>
          </section>
        </div>
        <footer className="review-actions"><button className="approve-button" type="button" onClick={() => resolveSignal("approved")}><Check size={21} weight="bold" /> Approve &amp; create opportunity</button><button className="dismiss-button" type="button" onClick={() => resolveSignal("dismissed")}><X size={21} /> Dismiss</button></footer>
      </article>
    </div>
  );
}
