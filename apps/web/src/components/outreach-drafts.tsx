"use client";

import { CalendarPlus, CheckCircle, Copy, EnvelopeSimple, PaperPlaneTilt, Sparkle, X } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import { generateOutreachAction, markOutreachSentAction } from "@/app/actions/generate-outreach";
import { createTaskAction } from "@/app/actions/manage-task";
import type { AccountIntelligenceDTO } from "@/types/account";

export function OutreachDrafts({ accountId, initialDrafts, contacts }: {
  accountId: string;
  initialDrafts: AccountIntelligenceDTO["outreachDrafts"];
  contacts: AccountIntelligenceDTO["contacts"];
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const [followUpDate, setFollowUpDate] = useState("");
  const [recipientId, setRecipientId] = useState("");

  function generate() {
    startTransition(async () => {
      const contact = contacts.find((item) => item.id === recipientId);
      const result = await generateOutreachAction(accountId, contact ? { name: contact.fullName, role: contact.stakeholderRole } : undefined);
      setNotice({ message: result.message, error: !result.ok });
      if (result.ok) setDrafts((current) => [result.draft, ...current]);
    });
  }

  function markSent(draftId: string) {
    startTransition(async () => {
      const result = await markOutreachSentAction(draftId);
      setNotice({ message: result.message, error: !result.ok });
      if (result.ok) setDrafts((current) => current.map((draft) => draft.id === draftId ? { ...draft, status: "sent", sentAt: result.sentAt } : draft));
    });
  }

  function scheduleFollowUp() {
    if (!followUpDate) return;
    startTransition(async () => {
      const result = await createTaskAction({ accountId, title: "Follow up on commercial outreach", description: "Review the recipient response and progress the next best action.", dueAt: `${followUpDate}T09:00:00.000Z` });
      setNotice({ message: result.message, error: !result.ok });
      if (result.ok) setFollowUpDate("");
    });
  }

  function setThreeDayFollowUp() {
    const due = new Date();
    due.setDate(due.getDate() + 3);
    setFollowUpDate(due.toISOString().slice(0, 10));
  }

  return (
    <section className="intelligence-panel outreach-panel" id="outreach">
      <header><div><p>Human-reviewed communication</p><h3>Outreach drafts</h3></div><span>{drafts.length}</span></header>
      <div className="outreach-toolbar"><p>Generate from retained signal and opportunity facts. Review the message, record sending, and schedule the next touch.</p><div className="outreach-ai-controls"><label>Personalize for<select value={recipientId} onChange={(event) => setRecipientId(event.target.value)}><option value="">General stakeholder</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName} · {contact.stakeholderRole.replaceAll("_", " ")}</option>)}</select></label><button className="button button-primary" type="button" disabled={pending} onClick={generate}><Sparkle size={16} weight="fill" />{pending ? "Working…" : "Generate AI draft"}</button></div></div>
      <div className="outreach-follow-up"><label><CalendarPlus size={16} /><span>Follow-up date</span><input type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} /></label><button className="follow-up-shortcut" type="button" disabled={pending} onClick={setThreeDayFollowUp}>In 3 days</button><button type="button" disabled={pending || !followUpDate} onClick={scheduleFollowUp}>Schedule task</button></div>
      {notice ? <div className={`outreach-notice ${notice.error ? "error" : ""}`}>{notice.error ? <X size={16} /> : <CheckCircle size={16} />}<span>{notice.message}</span></div> : null}
      {drafts.length ? <div className="outreach-list">{drafts.map((draft) => <article key={draft.id}><header><span><EnvelopeSimple size={18} /></span><div><strong>{draft.subject}</strong><small>{draft.status === "sent" ? `Sent ${draft.sentAt ? new Date(draft.sentAt).toLocaleDateString("en-GB") : ""}` : "Draft"} · {draft.generatedByEmail}</small></div><div className="outreach-card-actions"><button type="button" aria-label={`Copy ${draft.subject}`} onClick={() => navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`)}><Copy size={16} /></button>{draft.status !== "sent" ? <button type="button" aria-label={`Mark ${draft.subject} as sent`} disabled={pending} onClick={() => markSent(draft.id)}><PaperPlaneTilt size={16} /></button> : <span title="Outreach sent"><CheckCircle size={17} weight="fill" /></span>}</div></header><pre>{draft.body}</pre></article>)}</div> : <p className="panel-empty">No outreach drafts have been generated.</p>}
    </section>
  );
}
