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
  NewspaperClipping,
  RocketLaunch,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { useMemo, useState, useTransition } from "react";

import { reviewSignalAction } from "@/app/actions/review-signal";
import { assignSignalCompanyAction } from "@/app/actions/assign-signal-company";
import { IngestionControl } from "@/components/ingestion-control";
import type { IngestionSourceStatus } from "@/data/dashboard";
import type { SignalInboxDTO } from "@/types/signal";

type SignalInboxProps = {
  initialSignals: SignalInboxDTO[];
  loadError?: string;
  sources: IngestionSourceStatus[];
  canReview: boolean;
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

export function SignalInbox({ initialSignals, loadError, sources, canReview }: SignalInboxProps) {
  const [signals, setSignals] = useState(initialSignals);
  const [selectedId, setSelectedId] = useState<string | null>(initialSignals[0]?.id ?? null);
  const [sort, setSort] = useState<"newest" | "score">("newest");
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isPending, startTransition] = useTransition();

  const visibleSignals = useMemo(() => {
    return sort === "score" ? [...signals].sort((a, b) => b.score - a.score) : signals;
  }, [signals, sort]);
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
        setSignals((items) => items.map((item) => item.id === selected.id ? { ...item, company: result.companyName } : item));
        setCompanyName("");
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
            <span className="signal-age">{selected.age}</span>
            <button className="icon-button" type="button" aria-label="More signal actions">
              <DotsThree size={22} weight="bold" />
            </button>
          </div>
          <h2>{selected.company} {selected.headline.charAt(0).toLowerCase() + selected.headline.slice(1)}</h2>
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
            <h3>Why it matters</h3>
            <p>{selected.why}</p>
          </section>
          <section className="detail-card account-card">
            <h3>Company match</h3>
            <div className="account-heading">
              <span className={`company-mark ${selectedPresentation.tone}`}><SelectedIcon size={24} weight="fill" /></span>
              <div><strong>{selected.company}</strong><span className="pending-label">Pending human review</span></div>
            </div>
            <dl>
              <div><dt>Review status</dt><dd>Unreviewed</dd></div>
              <div><dt>Approval result</dt><dd>Create or reuse account</dd></div>
              <div><dt>Evidence records</dt><dd>{selected.evidence.length}</dd></div>
            </dl>
            {selected.company === "Unidentified company" && canReview ? <div className="company-correction"><label><span>Confirm company</span><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="e.g. Nvidia" /></label><button type="button" onClick={confirmCompany} disabled={isPending || !companyName.trim()}>Save match</button></div> : null}
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
