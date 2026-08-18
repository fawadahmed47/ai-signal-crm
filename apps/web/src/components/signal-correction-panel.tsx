"use client";

import { useState, useTransition } from "react";

import { correctSignalAction } from "@/app/actions/correct-signal";
import type { SignalInboxDTO } from "@/types/signal";

export function SignalCorrectionPanel({ signal, onCorrected }: { signal: SignalInboxDTO; onCorrected: (corrected: Partial<SignalInboxDTO>) => void }) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [location, setLocation] = useState(signal.location ?? "");
  const [category, setCategory] = useState(signal.type.toLowerCase());
  const [power, setPower] = useState(signal.powerCapacityMw?.toString() ?? "");
  const [investment, setInvestment] = useState(signal.investmentUsdMillions?.toString() ?? "");
  const [reason, setReason] = useState("");

  function save() {
    startTransition(async () => {
      const result = await correctSignalAction({ signalId: signal.id, location, category, powerCapacityMw: power, investmentUsdMillions: investment, reason });
      setNotice({ text: result.message, error: !result.ok });
      if (result.ok) {
        onCorrected({ ...result.corrected, type: result.corrected.category.charAt(0).toUpperCase() + result.corrected.category.slice(1) });
        setReason("");
      }
    });
  }

  return <section className="detail-card correction-card"><h3>Verify & correct extracted facts</h3><div className="correction-grid"><label><span>Location</span><input value={location} onChange={(event)=>setLocation(event.target.value)} /></label><label><span>Category</span><select value={category} onChange={(event)=>setCategory(event.target.value)}><option value="construction">Construction</option><option value="expansion">Expansion</option><option value="investment">Investment</option><option value="ai infrastructure">AI infrastructure</option><option value="capacity expansion">Capacity expansion</option><option value="product launch">Product launch</option><option value="market research">Market research</option><option value="other">Other</option></select></label><label><span>Power capacity (MW)</span><input type="number" min="0" step="0.01" value={power} onChange={(event)=>setPower(event.target.value)} /></label><label><span>Investment (USD millions)</span><input type="number" min="0" step="0.01" value={investment} onChange={(event)=>setInvestment(event.target.value)} /></label><label className="wide"><span>Correction reason</span><input value={reason} onChange={(event)=>setReason(event.target.value)} placeholder="Verified against the retained source" /></label></div><button className="button button-secondary" type="button" onClick={save} disabled={isPending || reason.trim().length < 3}>{isPending ? "Saving…" : "Save verified facts"}</button>{notice ? <p className={notice.error ? "correction-notice error" : "correction-notice"}>{notice.text}</p> : null}</section>;
}
