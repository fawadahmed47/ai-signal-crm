"use client";

import { CheckCircle, CurrencyDollar, PencilSimple, Plus, Target, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { saveOpportunityAction } from "@/app/actions/save-opportunity";
import { OPPORTUNITY_STAGES } from "@/data/opportunity-core";
import type { OpportunityAccountDTO, OpportunityDTO, OpportunityStage } from "@/types/opportunity";

type OpportunityWorkspaceProps = {
  initialOpportunities: OpportunityDTO[];
  accounts: OpportunityAccountDTO[];
  loadError?: string;
};

type FormState = {
  opportunityId?: string;
  accountId: string;
  name: string;
  stage: OpportunityStage;
  amountUsd: string;
  probability: string;
  expectedCloseDate: string;
};

const EMPTY_FORM: FormState = {
  accountId: "",
  name: "",
  stage: "identified",
  amountUsd: "",
  probability: "",
  expectedCloseDate: "",
};

function formatMoney(value: number | null) {
  if (value === null) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function stageLabel(stage: OpportunityStage) {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export function OpportunityWorkspace({
  initialOpportunities,
  accounts,
  loadError,
}: OpportunityWorkspaceProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const pipelineValue = useMemo(
    () => initialOpportunities
      .filter((opportunity) => opportunity.stage !== "lost")
      .reduce((total, opportunity) => total + (opportunity.amountUsd ?? 0), 0),
    [initialOpportunities],
  );

  function openCreateForm() {
    setForm({ ...EMPTY_FORM, accountId: accounts[0]?.id ?? "" });
    setNotice(null);
    setFormOpen(true);
  }

  function openEditForm(opportunity: OpportunityDTO) {
    setForm({
      opportunityId: opportunity.id,
      accountId: opportunity.accountId,
      name: opportunity.name,
      stage: opportunity.stage,
      amountUsd: opportunity.amountUsd?.toString() ?? "",
      probability: opportunity.probability?.toString() ?? "",
      expectedCloseDate: opportunity.expectedCloseDate ?? "",
    });
    setNotice(null);
    setFormOpen(true);
  }

  function submitOpportunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    startTransition(async () => {
      const result = await saveOpportunityAction({
        opportunityId: form.opportunityId,
        accountId: form.accountId,
        name: form.name,
        stage: form.stage,
        amountUsd: form.amountUsd === "" ? null : Number(form.amountUsd),
        probability: form.probability === "" ? null : Number(form.probability),
        expectedCloseDate: form.expectedCloseDate || null,
      });
      setNotice({ message: result.message, error: !result.ok });
      if (result.ok) {
        setFormOpen(false);
        setForm(EMPTY_FORM);
        router.refresh();
      }
    });
  }

  if (loadError) {
    return <section className="opportunity-empty error"><X size={42} /><h2>Opportunities unavailable</h2><p>{loadError}</p></section>;
  }

  return (
    <div className="opportunity-workspace">
      {notice ? (
        <div className={`signal-toast ${notice.error ? "error" : ""}`} role="status">
          {notice.error ? <X size={20} weight="bold" /> : <CheckCircle size={20} weight="fill" />}
          <span>{notice.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={16} /></button>
        </div>
      ) : null}

      <section className="opportunity-summary" aria-label="Pipeline summary">
        <div><span><Target size={22} /></span><p>Open opportunities<strong>{initialOpportunities.filter((item) => item.stage !== "won" && item.stage !== "lost").length}</strong></p></div>
        <div><span><CurrencyDollar size={22} /></span><p>Pipeline value<strong>{formatMoney(pipelineValue)}</strong></p></div>
        <button className="button button-primary" type="button" disabled={!accounts.length} onClick={openCreateForm}>
          <Plus size={18} weight="bold" /> New opportunity
        </button>
      </section>

      {!accounts.length ? (
        <section className="opportunity-empty">
          <Target size={42} weight="duotone" />
          <h2>Create an account first</h2>
          <p>Approve a matched signal in the Signal Inbox before creating an opportunity.</p>
        </section>
      ) : !initialOpportunities.length ? (
        <section className="opportunity-empty">
          <Target size={42} weight="duotone" />
          <h2>No opportunities yet</h2>
          <p>Create the first commercial opportunity for an approved account.</p>
          <button className="button button-primary" type="button" onClick={openCreateForm}><Plus size={18} /> New opportunity</button>
        </section>
      ) : (
        <section className="opportunity-table-card">
          <header><div><p>Commercial pipeline</p><h2>All opportunities</h2></div><span>{initialOpportunities.length} total</span></header>
          <div className="opportunity-table-wrap">
            <table className="opportunity-table">
              <thead><tr><th>Opportunity</th><th>Stage</th><th>Amount</th><th>Probability</th><th>Expected close</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {initialOpportunities.map((opportunity) => (
                  <tr key={opportunity.id}>
                    <td><strong>{opportunity.name}</strong><small>{opportunity.accountName}<br />{opportunity.ownerEmail}</small></td>
                    <td><span className={`stage-pill ${opportunity.stage}`}>{stageLabel(opportunity.stage)}</span></td>
                    <td>{formatMoney(opportunity.amountUsd)}</td>
                    <td>{opportunity.probability === null ? "Not set" : `${opportunity.probability}%`}</td>
                    <td>{opportunity.expectedCloseDate ?? "Not set"}</td>
                    <td><button className="icon-button" type="button" aria-label={`Edit ${opportunity.name}`} onClick={() => openEditForm(opportunity)}><PencilSimple size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {formOpen ? (
        <div className="opportunity-dialog-backdrop" role="presentation">
          <section className="opportunity-dialog" role="dialog" aria-modal="true" aria-labelledby="opportunity-form-title">
            <header><div><p>{form.opportunityId ? "Manage pipeline" : "Add to pipeline"}</p><h2 id="opportunity-form-title">{form.opportunityId ? "Edit opportunity" : "New opportunity"}</h2></div><button className="icon-button" type="button" aria-label="Close opportunity form" onClick={() => setFormOpen(false)}><X size={20} /></button></header>
            <form onSubmit={submitOpportunity}>
              <label>Account<select required value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.companyName}</option>)}</select></label>
              <label className="wide">Opportunity name<input required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Frankfurt expansion program" /></label>
              <label>Stage<select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as OpportunityStage })}>{OPPORTUNITY_STAGES.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}</select></label>
              <label>Amount (USD)<input type="number" min="0" step="0.01" value={form.amountUsd} onChange={(event) => setForm({ ...form, amountUsd: event.target.value })} placeholder="2500000" /></label>
              <label>Probability (%)<input type="number" min="0" max="100" step="1" value={form.probability} onChange={(event) => setForm({ ...form, probability: event.target.value })} placeholder="40" /></label>
              <label>Expected close<input type="date" value={form.expectedCloseDate} onChange={(event) => setForm({ ...form, expectedCloseDate: event.target.value })} /></label>
              <footer><button className="button button-secondary" type="button" onClick={() => setFormOpen(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={isPending}>{isPending ? "Saving…" : form.opportunityId ? "Save changes" : "Create opportunity"}</button></footer>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
