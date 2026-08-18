"use client";

import { ArrowSquareOut, ArrowsClockwise, CheckCircle, Clock, Database, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { runLocalIngestionAction } from "@/app/actions/run-local-ingestion";
import type { IngestionSourceStatus } from "@/data/dashboard";

type IngestionControlProps = { sources: IngestionSourceStatus[]; loadError?: string };

function formatImportedAt(value: string | null) {
  if (!value) return "No imports recorded";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function IngestionControl({ sources, loadError }: IngestionControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const primarySource = sources[0];

  function runImport() {
    startTransition(async () => {
      const result = await runLocalIngestionAction();
      setNotice({ message: result.message, error: !result.ok });
      if (result.ok) router.refresh();
    });
  }

  return (
    <section className="ingestion-control" aria-label="Local ingestion status">
      <div className="ingestion-control-copy">
        <span className="ingestion-icon"><Database size={19} weight="duotone" /></span>
        <div>
          <p>Market intelligence ingestion</p>
          <strong>{primarySource?.name ?? "No live source configured"}</strong>
          <small>{loadError ?? (primarySource ? `${primarySource.pendingSignals} awaiting review · ${formatImportedAt(primarySource.lastImportedAt)}` : "Run an import to populate the review queue.")}</small>
        </div>
      </div>
      {primarySource?.lastRunStatus ? <span className={`ingestion-run-status ${primarySource.lastRunStatus}`}>Last run: {primarySource.lastRunStatus} · {formatImportedAt(primarySource.lastRunAt)}</span> : null}
      <div className="ingestion-actions">
        {primarySource?.sourceUrl ? <a href={primarySource.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open configured feed"><ArrowSquareOut size={17} /></a> : null}
        <button className="import-button" type="button" onClick={runImport} disabled={isPending || Boolean(loadError)}>
          <ArrowsClockwise size={17} className={isPending ? "spinning" : ""} />
          {isPending ? "Importing…" : "Run ingestion"}
        </button>
      </div>
      <p className="ingestion-footnote"><Clock size={13} /> Runs the configured RSS pipeline. Articles are deduplicated and retain their evidence links.</p>
      {notice ? <p className={`ingestion-notice ${notice.error ? "error" : ""}`} role="status">{notice.error ? <WarningCircle size={16} /> : <CheckCircle size={16} weight="fill" />}{notice.message}</p> : null}
    </section>
  );
}
