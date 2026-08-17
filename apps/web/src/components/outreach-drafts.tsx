"use client";

import { CheckCircle, Copy, EnvelopeSimple, Sparkle, X } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import { generateOutreachAction } from "@/app/actions/generate-outreach";
import type { AccountIntelligenceDTO } from "@/types/account";

export function OutreachDrafts({ accountId, initialDrafts }: {
  accountId: string;
  initialDrafts: AccountIntelligenceDTO["outreachDrafts"];
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateOutreachAction(accountId);
      setNotice({ message: result.message, error: !result.ok });
      if (result.ok) setDrafts((current) => [result.draft, ...current]);
    });
  }

  return (
    <section className="intelligence-panel outreach-panel">
      <header><div><p>Human-reviewed communication</p><h3>Outreach drafts</h3></div><span>{drafts.length}</span></header>
      <div className="outreach-toolbar"><p>Generate from retained signal and opportunity facts. Nothing is sent automatically.</p><button className="button button-primary" type="button" disabled={pending} onClick={generate}><Sparkle size={16} weight="fill" />{pending ? "Generating…" : "Generate draft"}</button></div>
      {notice ? <div className={`outreach-notice ${notice.error ? "error" : ""}`}>{notice.error ? <X size={16} /> : <CheckCircle size={16} />}<span>{notice.message}</span></div> : null}
      {drafts.length ? <div className="outreach-list">{drafts.map((draft) => <article key={draft.id}><header><span><EnvelopeSimple size={18} /></span><div><strong>{draft.subject}</strong><small>Draft · {draft.generatedByEmail}</small></div><button type="button" aria-label={`Copy ${draft.subject}`} onClick={() => navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`)}><Copy size={16} /></button></header><pre>{draft.body}</pre></article>)}</div> : <p className="panel-empty">No outreach drafts have been generated.</p>}
    </section>
  );
}
