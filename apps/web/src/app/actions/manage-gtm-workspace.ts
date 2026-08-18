"use server";

import { revalidatePath } from "next/cache";

import { getUserSession } from "@/data/auth-session";
import { getDatabasePool } from "@/data/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createCampaignAction(value: { name: string; description: string; accountIds: string[] }) {
  const session = await getUserSession();
  if (!session || (session.role !== "marketer" && session.role !== "manager")) return { ok: false as const, message: "Sign in to manage campaigns." };
  const name = value.name.trim();
  const accountIds = [...new Set(value.accountIds.filter((id) => UUID_PATTERN.test(id)))];
  if (name.length < 3 || name.length > 140) return { ok: false as const, message: "Campaign name must be 3–140 characters." };
  if (!accountIds.length) return { ok: false as const, message: "Select at least one qualified account." };
  const pool = getDatabasePool();
  const campaign = await pool.query<{id:string}>("INSERT INTO campaigns (name,description,status,owner_email) VALUES ($1,$2,'active',$3) RETURNING id::text", [name, value.description.trim() || null, session.email]);
  for (const accountId of accountIds) await pool.query("INSERT INTO campaign_members (campaign_id,account_id) SELECT $1,id FROM accounts WHERE id=$2 ON CONFLICT DO NOTHING", [campaign.rows[0].id, accountId]);
  revalidatePath("/gtm-workspace");
  return { ok: true as const, message: `Campaign activated with ${accountIds.length} account${accountIds.length === 1 ? "" : "s"}.` };
}

export async function updateCampaignMemberAction(value: { campaignId: string; accountId: string; memberStatus: string }) {
  const session = await getUserSession();
  const statuses = ["ready", "contacted", "replied", "meeting_booked", "removed"];
  if (!session || (session.role !== "marketer" && session.role !== "manager") || !UUID_PATTERN.test(value.campaignId) || !UUID_PATTERN.test(value.accountId) || !statuses.includes(value.memberStatus)) return { ok: false as const, message: "Invalid campaign update." };
  const result = await getDatabasePool().query("UPDATE campaign_members SET member_status=$3 WHERE campaign_id=$1 AND account_id=$2 RETURNING account_id", [value.campaignId, value.accountId, value.memberStatus]);
  if (!result.rowCount) return { ok: false as const, message: "Campaign member not found." };
  revalidatePath("/gtm-workspace");
  return { ok: true as const, message: "Campaign response status updated." };
}

export async function applyLeadRoutingAction(value: { accountId: string; signalId: string | null; assignedToEmail: string; ruleName: string; rationale: string }) {
  const session = await getUserSession();
  if (!session || (session.role !== "marketer" && session.role !== "manager") || !UUID_PATTERN.test(value.accountId) || !["manager@aisignalcrm.local", "marketer@aisignalcrm.local"].includes(value.assignedToEmail)) return { ok: false as const, message: "Invalid routing request." };
  const pool = getDatabasePool();
  const updated = await pool.query("UPDATE accounts SET owner_email=$2,updated_at=now() WHERE id=$1 RETURNING id", [value.accountId, value.assignedToEmail]);
  if (!updated.rowCount) return { ok: false as const, message: "Account not found." };
  await pool.query("INSERT INTO lead_routing_audits (account_id,signal_id,rule_name,assigned_to_email,rationale,routed_by_email) VALUES ($1,$2,$3,$4,$5,$6)", [value.accountId, UUID_PATTERN.test(value.signalId ?? "") ? value.signalId : null, value.ruleName, value.assignedToEmail, value.rationale, session.email]);
  await pool.query("INSERT INTO activity_events (account_id,actor_email,event_type,details) VALUES ($1,$2,'lead_routed',jsonb_build_object('assignedTo',$3::text,'rule',$4::text,'rationale',$5::text))", [value.accountId, session.email, value.assignedToEmail, value.ruleName, value.rationale]);
  revalidatePath("/gtm-workspace"); revalidatePath("/accounts"); revalidatePath(`/accounts/${value.accountId}`);
  return { ok: true as const, message: "Lead routed and recorded in the audit trail." };
}

export async function completeEnrichmentAction(value: { accountId: string; website: string; countryCode: string }) {
  const session = await getUserSession();
  if (!session || (session.role !== "marketer" && session.role !== "manager") || !UUID_PATTERN.test(value.accountId)) return { ok: false as const, message: "Invalid enrichment update." };
  const website = value.website.trim(); const country = value.countryCode.trim().toUpperCase();
  if (website && !/^https?:\/\/[^\s]+$/i.test(website)) return { ok: false as const, message: "Website must start with http:// or https://." };
  if (country && !/^[A-Z]{2}$/.test(country)) return { ok: false as const, message: "Country must use a two-letter code." };
  const result = await getDatabasePool().query("UPDATE companies c SET website=COALESCE(NULLIF($2,''),c.website),country_code=COALESCE(NULLIF($3,''),c.country_code),updated_at=now() FROM accounts a WHERE a.id=$1 AND a.company_id=c.id RETURNING a.id", [value.accountId, website, country]);
  if (!result.rowCount) return { ok: false as const, message: "Account not found." };
  await getDatabasePool().query("INSERT INTO activity_events (account_id,actor_email,event_type,details) VALUES ($1,$2,'enrichment_completed',jsonb_build_object('website',$3::text,'countryCode',$4::text))", [value.accountId, session.email, website || null, country || null]);
  revalidatePath("/gtm-workspace"); revalidatePath(`/accounts/${value.accountId}`);
  return { ok: true as const, message: "Company enrichment saved." };
}
