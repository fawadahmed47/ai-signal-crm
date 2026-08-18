"use client";

import { useState, useTransition } from "react";

import { updateAccountLifecycleAction } from "@/app/actions/update-lifecycle";
import { LIFECYCLE_LABELS } from "@/components/lifecycle-pill";
import type { CommercialLifecycleStage } from "@/types/signal";

const STAGES = Object.keys(LIFECYCLE_LABELS) as CommercialLifecycleStage[];

export function LifecycleControl({ accountId, initialStage, canEdit }: { accountId: string; initialStage: CommercialLifecycleStage; canEdit: boolean }) {
  const [stage, setStage] = useState(initialStage);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  function update(nextStage: CommercialLifecycleStage) {
    const previousStage = stage;
    setStage(nextStage);
    setNotice("");
    startTransition(async () => {
      const result = await updateAccountLifecycleAction(accountId, nextStage);
      setNotice(result.message);
      if (!result.ok) setStage(previousStage);
    });
  }

  if (!canEdit) return <span className={`lifecycle-pill lifecycle-${stage}`}>{LIFECYCLE_LABELS[stage]}</span>;

  return (
    <div className="lifecycle-control">
      <label>
        <span>Lifecycle</span>
        <select value={stage} disabled={pending} onChange={(event) => update(event.target.value as CommercialLifecycleStage)}>
          {STAGES.map((item) => <option key={item} value={item}>{LIFECYCLE_LABELS[item]}</option>)}
        </select>
      </label>
      {notice ? <small role="status">{notice}</small> : null}
    </div>
  );
}
