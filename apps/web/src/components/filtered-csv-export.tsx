"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

const LIFECYCLES = [
  ["", "All lifecycle stages"],
  ["marketing_qualified", "Marketing qualified"],
  ["sales_accepted", "Sales accepted"],
  ["opportunity", "Opportunity"],
  ["won", "Won"],
] as const;

export function FilteredCsvExport() {
  const [status, setStatus] = useState("approved");
  const [minimumScore, setMinimumScore] = useState("70");
  const [lifecycle, setLifecycle] = useState("");
  const href = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (minimumScore) params.set("minScore", minimumScore);
    if (lifecycle) params.set("lifecycle", lifecycle);
    return `/api/exports/signals.csv?${params.toString()}`;
  }, [status, minimumScore, lifecycle]);

  return (
    <section className="csv-export-panel" aria-labelledby="csv-export-title">
      <div>
        <p>Sales-ready handoff</p>
        <h2 id="csv-export-title">Export cleaned leads</h2>
        <span>Download only the leads your commercial team is ready to action, including evidence, score, owner, lifecycle, and next action.</span>
      </div>
      <div className="csv-export-controls">
        <label>Review status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All reviewed states</option><option value="approved">Approved</option><option value="pending">Pending review</option><option value="rejected">Rejected</option></select></label>
        <label>Minimum score<select value={minimumScore} onChange={(event) => setMinimumScore(event.target.value)}><option value="">Any score</option><option value="50">50+</option><option value="70">70+ high intent</option><option value="85">85+ urgent</option></select></label>
        <label>Lifecycle<select value={lifecycle} onChange={(event) => setLifecycle(event.target.value)}>{LIFECYCLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <a className="button button-primary" href={href}><DownloadSimple size={17} weight="bold" /> Download CSV</a>
      </div>
    </section>
  );
}
