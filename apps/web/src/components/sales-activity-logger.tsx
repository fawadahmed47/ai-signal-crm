"use client";

import { CalendarPlus, CheckCircle, Phone, EnvelopeSimple, UsersThree, NotePencil, X } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import { logSalesActivityAction } from "@/app/actions/manage-account-relations";

const ACTIVITY_TYPES = [
  { value: "call_logged", label: "Log call", icon: Phone },
  { value: "email_logged", label: "Log email", icon: EnvelopeSimple },
  { value: "meeting_booked", label: "Book meeting", icon: UsersThree },
  { value: "commercial_note", label: "Add note", icon: NotePencil },
] as const;

export function SalesActivityLogger({ accountId }: { accountId: string }) {
  const [activityType, setActivityType] = useState<(typeof ACTIVITY_TYPES)[number]["value"]>("call_logged");
  const [summary, setSummary] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  function submit() {
    startTransition(async () => {
      const result = await logSalesActivityAction({ accountId, activityType, summary, nextStep, dueAt: dueAt ? `${dueAt}T09:00:00.000Z` : undefined });
      setNotice({ message: result.message, error: !result.ok });
      if (result.ok) { setSummary(""); setNextStep(""); setDueAt(""); }
    });
  }
  return <section className="intelligence-panel activity-logger" aria-labelledby="activity-logger-title"><header><div><p>Sales execution</p><h3 id="activity-logger-title">Log commercial activity</h3></div><span>Audited</span></header><div className="activity-type-row">{ACTIVITY_TYPES.map(({ value, label, icon: Icon }) => <button className={activityType === value ? "selected" : ""} key={value} type="button" onClick={() => setActivityType(value)}><Icon size={17} />{label}</button>)}</div><div className="activity-log-form"><label>Outcome / context<textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="e.g. Procurement confirmed interest in a 30-minute qualification call." maxLength={2000} /></label><div><label>Next step (optional)<input value={nextStep} onChange={(event) => setNextStep(event.target.value)} placeholder="e.g. Send technical questionnaire" maxLength={200} /></label><label>Due date<input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label></div><button className="button button-primary" type="button" disabled={pending || summary.trim().length < 3} onClick={submit}><CalendarPlus size={16} />{pending ? "Saving…" : nextStep ? "Log & schedule" : "Log activity"}</button></div>{notice ? <div className={`outreach-notice ${notice.error ? "error" : ""}`}>{notice.error ? <X size={16} /> : <CheckCircle size={16} />}<span>{notice.message}</span></div> : null}</section>;
}
