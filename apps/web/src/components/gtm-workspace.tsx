"use client";

import { CheckCircle, FunnelSimple, MagicWand, PaperPlaneTilt, UserSwitch, Wrench } from "@phosphor-icons/react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { applyLeadRoutingAction, completeEnrichmentAction, createCampaignAction } from "@/app/actions/manage-gtm-workspace";
import type { GtmWorkspaceDTO } from "@/types/gtm";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

export function GtmWorkspace({ workspace }: { workspace: GtmWorkspaceDTO }) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(workspace.availableAccounts.filter((account) => account.score >= 70).slice(0, 3).map((account) => account.id));
  const [campaignName, setCampaignName] = useState("DACH infrastructure expansion");
  const [description, setDescription] = useState("Evidence-backed outreach to high-intent infrastructure accounts.");
  const [enrichmentDrafts, setEnrichmentDrafts] = useState<Record<string, { website: string; countryCode: string }>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleAccount(id: string) {
    setSelectedAccounts((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }
  function createCampaign() {
    startTransition(async () => {
      const result = await createCampaignAction({ name: campaignName, description, accountIds: selectedAccounts });
      setNotice(result.message);
    });
  }
  function route(item: GtmWorkspaceDTO["routing"][number]) {
    startTransition(async () => {
      const result = await applyLeadRoutingAction({ accountId:item.accountId, signalId:item.signalId, assignedToEmail:item.suggestedOwner, ruleName:item.ruleName, rationale:item.rationale });
      setNotice(result.message);
    });
  }
  function enrich(item: GtmWorkspaceDTO["enrichment"][number]) {
    startTransition(async () => {
      const draft = enrichmentDrafts[item.accountId] ?? { website:item.website ?? "", countryCode:item.countryCode ?? "" };
      const result = await completeEnrichmentAction({ accountId:item.accountId, website:draft.website, countryCode:draft.countryCode });
      setNotice(result.message);
    });
  }

  return <div className="gtm-workspace">
    <section className="gtm-hero"><div><p>AI-assisted revenue operations</p><h2>Turn evidence into activated pipeline.</h2><span>Rules recommend the next owner, campaigns organize high-intent accounts, and the enrichment queue keeps sales records complete before outreach.</span></div><Link className="button" href="/sales-workspace"><CheckCircle size={17} weight="fill" /> Open today’s queue</Link></section>
    {notice ? <p className="gtm-notice" role="status"><CheckCircle size={16} weight="fill" />{notice}</p> : null}

    <section className="gtm-section"><header><div><p>Campaign workspace</p><h2>Activate a target segment</h2></div><span>{workspace.campaigns.length} campaigns</span></header><div className="campaign-builder"><div className="campaign-form"><label>Campaign name<input value={campaignName} maxLength={140} onChange={(event) => setCampaignName(event.target.value)} /></label><label>Commercial objective<textarea value={description} maxLength={600} onChange={(event) => setDescription(event.target.value)} /></label><button className="button button-primary" type="button" disabled={pending || !selectedAccounts.length} onClick={createCampaign}><PaperPlaneTilt size={17} weight="fill" /> {pending ? "Saving…" : `Activate for ${selectedAccounts.length} accounts`}</button></div><div className="campaign-account-picker"><strong>High-intent audience</strong><small>Select accounts for this campaign.</small>{workspace.availableAccounts.map((account) => <label key={account.id}><input type="checkbox" checked={selectedAccounts.includes(account.id)} onChange={() => toggleAccount(account.id)} /><span>{account.companyName}</span><b>{account.score}</b></label>)}</div></div>{workspace.campaigns.length ? <div className="campaign-list">{workspace.campaigns.map((campaign) => <article key={campaign.id}><div><span className={`campaign-status ${campaign.status}`}>{campaign.status}</span><strong>{campaign.name}</strong><small>{campaign.description ?? "No campaign objective recorded."}</small></div><dl><div><dt>Audience</dt><dd>{campaign.members}</dd></div><div><dt>Contacted</dt><dd>{campaign.contacted}</dd></div><div><dt>Replies</dt><dd>{campaign.replies}</dd></div><div><dt>Meetings</dt><dd>{campaign.meetings}</dd></div></dl></article>)}</div> : null}</section>

    <section className="gtm-grid"><article className="gtm-section"><header><div><p>Routing automation</p><h2>Suggested lead routing</h2></div><UserSwitch size={23} /></header><div className="routing-list">{workspace.routing.slice(0, 6).map((item) => <div key={item.accountId}><div><strong>{item.companyName}</strong><small>{item.ruleName} · score {item.score}{item.investmentUsdMillions ? ` · ${money.format(item.investmentUsdMillions * 1_000_000)} investment` : ""}</small><span>{item.rationale}</span></div><button type="button" disabled={pending} onClick={() => route(item)}>{item.routedAt ? "Reapply rule" : `Route to ${item.suggestedOwner.startsWith("manager") ? "manager" : "marketer"}`}</button></div>)}</div></article>
      <article className="gtm-section"><header><div><p>Data enrichment</p><h2>Records needing attention</h2></div><Wrench size={23} /></header><div className="enrichment-list">{workspace.enrichment.slice(0, 6).map((item) => { const draft = enrichmentDrafts[item.accountId] ?? { website:item.website ?? "", countryCode:item.countryCode ?? "" }; return <div key={item.accountId}><div><strong>{item.companyName}</strong><small>Missing: {item.missing.join(", ")}</small><span className="enrichment-inputs"><input aria-label={`${item.companyName} website`} value={draft.website} placeholder="https://company.com" onChange={(event) => setEnrichmentDrafts((current) => ({ ...current, [item.accountId]: { ...draft, website:event.target.value } }))} /><input aria-label={`${item.companyName} country code`} value={draft.countryCode} maxLength={2} placeholder="DE" onChange={(event) => setEnrichmentDrafts((current) => ({ ...current, [item.accountId]: { ...draft, countryCode:event.target.value.toUpperCase() } }))} /></span></div><Link href={`/accounts/${item.accountId}`}>Open record</Link><button type="button" disabled={pending || (!draft.website && !draft.countryCode)} onClick={() => enrich(item)}>Save fields</button></div>; })}{!workspace.enrichment.length ? <p className="panel-empty">Every active account has its core enrichment fields.</p> : null}</div></article></section>
    <section className="gtm-flow"><MagicWand size={21} /><span>AI GTM operating model</span><strong>Signal scored</strong><i>→</i><strong>Evidence verified</strong><i>→</i><strong>Lead routed</strong><i>→</i><strong>Campaign activated</strong><i>→</i><strong>Sales follow-up</strong><FunnelSimple size={19} /></section>
  </div>;
}
