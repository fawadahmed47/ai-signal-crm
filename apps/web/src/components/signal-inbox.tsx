"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  Check,
  CheckCircle,
  DotsThree,
  Factory,
  FunnelSimple,
  Lightning,
  MagnifyingGlass,
  BookmarkSimple,
  NewspaperClipping,
  RocketLaunch,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { useMemo, useState, useTransition } from "react";

import { reviewSignalAction } from "@/app/actions/review-signal";
import { assignSignalCompanyAction } from "@/app/actions/assign-signal-company";
import { saveSignalViewAction } from "@/app/actions/save-signal-view";
import { IngestionControl } from "@/components/ingestion-control";
import { SignalCorrectionPanel } from "@/components/signal-correction-panel";
import { LifecyclePill } from "@/components/lifecycle-pill";
import type { IngestionSourceStatus } from "@/data/dashboard";
import type { SavedSignalView } from "@/data/saved-views";
import type { SignalInboxDTO } from "@/types/signal";

type SignalInboxProps = {
  initialSignals: SignalInboxDTO[];
  loadError?: string;
  sources: IngestionSourceStatus[];
  canReview: boolean;
  initialSavedViews: SavedSignalView[];
};

function presentationFor(type: string) {
  switch (type.toLowerCase()) {
    case "construction":
      return { icon: Factory, tone: "green" };
    case "expansion":
      return { icon: RocketLaunch, tone: "blue" };
    case "investment":
      return { icon: Lightning, tone: "teal" };
    default:
      return { icon: Sparkle, tone: "purple" };
  }
}

export function SignalInbox({ initialSignals, loadError, sources, canReview, initialSavedViews }: SignalInboxProps) {
  const [signals, setSignals] = useState(initialSignals);
  const [selectedId, setSelectedId] = useState<string | null>(initialSignals[0]?.id ?? null);
  const [sort, setSort] = useState<"newest" | "score">("newest");
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [minInvestment, setMinInvestment] = useState(0);
  const [viewName, setViewName] = useState("");
  const [savedViews, setSavedViews] = useState(initialSavedViews);
  const [isPending, startTransition] = useTransition();

  const visibleSignals = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = signals.filter((signal) => (!query || `${signal.company} ${signal.headline} ${signal.location ?? ""}`.toLowerCase().includes(query)) && (!category || signal.type.toLowerCase() === category) && signal.score >= minScore && (signal.investmentUsdMillions ?? 0) >= minInvestment);
    return sort === "score" ? [...filtered].sort((a, b) => b.score - a.score) : filtered;
  }, [signals, sort, search, category, minScore, minInvestment]);
  const selected = signals.find((signal) => signal.id === selectedId) ?? visibleSignals[0];

  function resolveSignal(decision: "approved" | "rejected") {
    if (!selected || isPending) return;
    startTransition(async () => {
      const result = await reviewSignalAction({
        signalId: selected.id,
        decision,
        reason: reviewNote.trim() || undefined,
      });
      if (!result.ok) {
        setNotice({ message: result.message, error: true });
        return;
      }

      const remaining = signals.filter((item) => item.id !== selected.id);
      setSignals(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setReviewNote("");
      setNotice({ message: result.message, error: false });
    });
  }

  function confirmCompany() {
    if (!selected || isPending) return;
    startTransition(async () => {
      const result = await assignSignalCompanyAction(selected.id, companyName);
      setNotice({ message: result.message, error: !result.ok });
      if (result.ok) {
        setSignals((items) => items.map((item) => item.id === selected.id ? { ...item, company: result.companyName, companyMatch: "matched", lifecycleStage: result.lifecycleStage } : item));
        setCompanyName("");
      }
    });
  }

  function applySavedView(id: string) {
    const view = savedViews.find((item) => item.id === id);
    if (!view) return;
    setSearch(view.filters.search); setCategory(view.filters.category); setMinScore(view.filters.minScore); setMinInvestment(view.filters.minInvestment);
  }

  function saveView() {
    startTransition(async () => {
      const filters = { search, category, minScore, minInvestment };
      const result = await saveSignalViewAction(viewName, filters);
      setNotice({ message: result.message, error: !result.ok });
      if (result.ok) {
        setSavedViews((items) => [...items.filter((item) => item.name !== viewName.trim()), { id: viewName.trim(), name: viewName.trim(), filters }].sort((a,b)=>a.name.localeCompare(b.name)));
        setViewName("");
      }
    });
  }

  if (!selected) {
    return (
      <div className="signal-empty-wrap">
        <IngestionControl sources={sources} loadError={loadError} />
        <section className={`signal-empty ${loadError ? "error" : ""}`}>
          {loadError ? <X size={42} /> : <CheckCircle size={42} weight="duotone" />}
          <h2>{loadError ? "Signal inbox unavailable" : "Inbox cleared"}</h2>
          <p>{loadError ?? "There are no unreviewed signals left in this view."}</p>
        </section>
      </div>
    );
  }

  const selectedPresentation = presentationFor(selected.type);
  const SelectedIcon = selectedPresentation.icon;
  const opportunityLevel = selected.score >= 75 ? "High" : selected.score >= 45 ? "Medium" : "Low";
  const money = selected.investmentUsdMillions === null ? "Not reported" : `$${selected.investmentUsdMillions.toLocaleString("en-US")}M`;
  const capacity = selected.powerCapacityMw === null ? "Not reported" : `${selected.powerCapacityMw.toLocaleString("en-US")} MW`;
  const priority = selected.score >= 75 ? "Hot lead" : selected.score >= 45 ? "Warm lead" : "Monitor";
  const scoreFactors = [
    ["Commercial event", selected.scoreBreakdown.category, 35],
    ["Investment scale", selected.scoreBreakdown.investment, 25],
    ["Power capacity", selected.scoreBreakdown.powerCapacity, 20],
    ["Evidence quality", selected.scoreBreakdown.evidence, 20],
  ] as const;

  return (
    <div className="signal-inbox">
      {notice ? (
        <div className={`signal-toast ${notice.error ? "error" : ""}`} role="status">
          {notice.error ? <X size={20} weight="bold" /> : <CheckCircle size={20} weight="fill" />}
          <span>{notice.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      ) : null}

      <section className="signal-list-pane" aria-label="Detected signals">
        <div className="signal-list-tools">
          <IngestionControl sources={sources} loadError={loadError} />
          <label className="signal-search"><MagnifyingGlass size={16} /><span className="sr-only">Search leads</span><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search company, signal, location" /></label>
          <div className="lead-filter-grid"><label><span>Category</span><select value={category} onChange={(event)=>setCategory(event.target.value)}><option value="">All categories</option><option value="construction">Construction</option><option value="expansion">Expansion</option><option value="investment">Investment</option><option value="ai infrastructure">AI infrastructure</option><option value="capacity expansion">Capacity expansion</option><option value="other">Other</option></select></label><label><span>Minimum score</span><input type="number" min="0" max="100" value={minScore} onChange={(event)=>setMinScore(Number(event.target.value))} /></label><label><span>Minimum $M</span><input type="number" min="0" value={minInvestment} onChange={(event)=>setMinInvestment(Number(event.target.value))} /></label></div>
          <div className="saved-view-row"><select aria-label="Apply saved view" defaultValue="" onChange={(event)=>applySavedView(event.target.value)}><option value="">Saved views</option>{savedViews.map((view)=><option key={view.id} value={view.id}>{view.name}</option>)}</select><input aria-label="Saved view name" value={viewName} onChange={(event)=>setViewName(event.target.value)} placeholder="View name" /><button type="button" onClick={saveView} disabled={isPending || viewName.trim().length < 2}><BookmarkSimple size={15} /> Save</button></div>
          <div className="signal-sort-row">
            <label>
              <span className="sr-only">Sort signals</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as "newest" | "score")}
              >
                <option value="newest">Sort: Newest</option>
                <option value="score">Sort: Opportunity score</option>
              </select>
            </label>
            <button className="filter-button" type="button" aria-label="Filter signals">
              <FunnelSimple size={19} />
            </button>
          </div>
        </div>
        <div className="signal-list" role="listbox" aria-label="Signal results">
          {visibleSignals.map((signal) => {
            const presentation = presentationFor(signal.type);
            const Icon = presentation.icon;
            return (
              <button
                className={`signal-list-card ${signal.id === selected.id ? "selected" : ""}`}
                key={signal.id}
                type="button"
                role="option"
                aria-selected={signal.id === selected.id}
                onClick={() => {
                  setSelectedId(signal.id);
                  setNotice(null);
                  setReviewNote("");
                }}
              >
                <span className={`company-mark ${presentation.tone}`}>
                  <Icon size={24} weight="fill" />
                </span>
                <span className="signal-card-copy">
                  <strong>{signal.company}</strong>
                  <span>{signal.headline}</span>
                  <LifecyclePill stage={signal.lifecycleStage} />
                </span>
                <span className="signal-card-meta">
                  <small>{signal.age}</small>
                  <b className={signal.score >= 75 ? "high" : "medium"}>{signal.score}</b>
                </span>
              </button>
            );
          })}
        </div>
        <footer className="signal-list-footer">
          <span>Showing 1–{visibleSignals.length} of {signals.length}</span>
          <span className="list-pagination">
            <button type="button" aria-label="Previous page" disabled><ArrowLeft size={16} /></button>
            <button type="button" aria-label="Next page" disabled><ArrowRight size={16} /></button>
          </span>
        </footer>
      </section>

      <article className="signal-detail-pane" aria-live="polite" aria-busy={isPending}>
        <header className="signal-detail-header">
          <div className="signal-detail-topline">
            <span className="detected-pill"><span /> AI-detected signal</span>
            <LifecyclePill stage={selected.lifecycleStage} />
            <span className="signal-age">{selected.age}</span>
            <button className="icon-button" type="button" aria-label="More signal actions">
              <DotsThree size={22} weight="bold" />
            </button>
          </div>
          <h2>{selected.headline}</h2>
          <div className="signal-metrics">
            <div className="metric"><span>Confidence</span><div><strong>{selected.confidence}</strong><b className="score-ring">{selected.score}</b></div></div>
            <div className="metric"><span>Opportunity score</span><div><strong>{selected.score}</strong><em>{opportunityLevel}</em></div></div>
            <div className="metric"><span>Signal type</span><div><SelectedIcon size={20} /><strong>{selected.type}</strong></div></div>
            <div className="metric"><span>Detected</span><div><strong>{selected.detected}</strong></div></div>
            <div className="metric commercial-value"><span>Potential investment</span><div><strong>{money}</strong><em>Reported value</em></div></div>
            <div className="metric commercial-value"><span>Capacity need</span><div><strong>{capacity}</strong><em>Reported MW</em></div></div>
          </div>
        </header>

        <div className="signal-detail-grid">
          <section className="detail-card why-card">
            <div className="detail-card-title"><h3>Why it matters</h3><span className={`lead-priority ${priority.split(" ")[0].toLowerCase()}`}>{priority}</span></div>
            <p>{selected.why}</p>
          </section>
          <section className="detail-card score-explain-card">
            <div className="detail-card-title"><h3>Lead score explained</h3><strong>{selected.score}/100</strong></div>
            <p>Auditable scoring ranks review priority; it never approves a lead automatically.</p>
            <div className="score-factor-list">
              {scoreFactors.map(([name, value, maximum]) => <div key={name}><span>{name}<small>{value}/{maximum}</small></span><div><i style={{ width: `${maximum ? Math.min(100, value / maximum * 100) : 0}%` }} /></div></div>)}
            </div>
          </section>
          <section className="detail-card account-card">
            <h3>Company match</h3>
            <div className="account-heading">
              <span className={`company-mark ${selectedPresentation.tone}`}><SelectedIcon size={24} weight="fill" /></span>
              <div><strong>{selected.company}</strong><span className="pending-label">{selected.companyMatch === "matched" ? "Confirmed company match" : selected.companyMatch === "suggested" ? "Suggested from article headline — verify" : "Company verification needed"}</span></div>
            </div>
            <dl>
              <div><dt>Review status</dt><dd>Unreviewed</dd></div>
              <div><dt>Approval result</dt><dd>Create or reuse account</dd></div>
              <div><dt>Evidence records</dt><dd>{selected.evidence.length}</dd></div>
            </dl>
            {selected.companyMatch !== "matched" && canReview ? <div className="company-correction"><label><span>Confirm company</span><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="e.g. Nvidia" /></label><button type="button" onClick={confirmCompany} disabled={isPending || !companyName.trim()}>Save match</button></div> : null}
          </section>
          <section className="detail-card evidence-card">
            <h3>Source evidence</h3>
            {selected.evidence.length ? (
              <div className="evidence-list">
                {selected.evidence.map((source) => (
                  source.isDemo ? (
                    <div className="demo-evidence" key={source.url}>
                      <span className="source-mark"><NewspaperClipping size={16} weight="duotone" /></span>
                      <span><strong>Internal sample scenario</strong><small>This sample has no external news article. Use a Data Center Dynamics card for a live source.</small></span>
                    </div>
                  ) : (
                    <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                      <span className="source-mark"><NewspaperClipping size={16} weight="duotone" /></span>
                      <span><strong>{source.title}</strong><small>{source.publisher} · {selected.detected}</small></span>
                      <ArrowSquareOut size={18} />
                    </a>
                  )
                ))}
              </div>
            ) : <p>No retained evidence URL is available for this signal.</p>}
          </section>
          <section className="detail-card assignment-card review-feedback-card">
            <h3>Review feedback</h3>
            <p>{canReview ? "Record why this signal should proceed or be dismissed. A note is required for dismissal." : "Manager view is read-only. Sign in as a marketer to verify and review signals."}</p>
            <label>
              <span>Review note</span>
              <textarea
                value={reviewNote}
                maxLength={1_000}
                disabled={!canReview}
                placeholder="Add evidence corrections or decision context"
                onChange={(event) => setReviewNote(event.target.value)}
              />
            </label>
            <small>{reviewNote.length}/1,000 characters</small>
          </section>
          {canReview ? <SignalCorrectionPanel key={selected.id} signal={selected} onCorrected={(corrected) => setSignals((items) => items.map((item) => item.id === selected.id ? { ...item, ...corrected } : item))} /> : null}
        </div>
        <footer className="review-actions">
          <button className="approve-button" type="button" disabled={isPending || !canReview} onClick={() => resolveSignal("approved")}>
            <Check size={21} weight="bold" /> {isPending ? "Creating account…" : "Approve & create account"}
          </button>
          <button className="dismiss-button" type="button" disabled={isPending || !reviewNote.trim() || !canReview} onClick={() => resolveSignal("rejected")}>
            <X size={21} /> Dismiss
          </button>
        </footer>
      </article>
    </div>
  );
}
