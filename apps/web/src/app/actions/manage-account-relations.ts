"use server";

import { revalidatePath } from "next/cache";

import { getUserSession } from "@/data/auth-session";
import { getDatabasePool } from "@/data/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONTACT_ROLES = ["decision_maker", "procurement", "facilities", "engineering", "finance", "champion", "other"] as const;
const CONTACT_STATUSES = ["identified", "contacted", "replied", "meeting_booked", "not_a_fit"] as const;

export async function addContactAction(value: { accountId: string; fullName: string; jobTitle: string; email: string; phone: string; stakeholderRole: string }) {
  const session = await getUserSession();
  if (!session || session.role !== "marketer") return { ok: false as const, message: "Marketer access is required." };
  const name = value.fullName.trim(); const email = value.email.trim().toLowerCase();
  if (!UUID_PATTERN.test(value.accountId) || name.length < 2 || name.length > 160) return { ok: false as const, message: "Enter a valid contact name." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, message: "Enter a valid contact email." };
  const role = CONTACT_ROLES.includes(value.stakeholderRole as typeof CONTACT_ROLES[number]) ? value.stakeholderRole as typeof CONTACT_ROLES[number] : "other";
  const result = await getDatabasePool().query<{ id: string; created_at: Date }>(
    `INSERT INTO account_contacts (account_id,full_name,job_title,email,phone,stakeholder_role,created_by_user_id)
     SELECT id,$2,$3,$4,$5,$6,$7 FROM accounts WHERE id=$1 RETURNING id::text,created_at`,
    [value.accountId, name, value.jobTitle.trim() || null, email || null, value.phone.trim() || null, role, session.userId],
  );
  if (!result.rowCount) return { ok: false as const, message: "Account not found." };
  await getDatabasePool().query("INSERT INTO activity_events (account_id,actor_email,event_type,details) VALUES ($1,$2,'contact_added',jsonb_build_object('name',$3::text))", [value.accountId, session.email, name]);
  revalidatePath(`/accounts/${value.accountId}`);
  return { ok: true as const, message: "Contact added.", contact: { id: result.rows[0].id, fullName: name, jobTitle: value.jobTitle.trim() || null, email: email || null, phone: value.phone.trim() || null, stakeholderRole: role, engagementStatus: "identified" as const, lastContactedAt: null, nextFollowUpAt: null, createdAt: result.rows[0].created_at.toISOString() } };
}

export async function updateContactEngagementAction(value: { accountId: string; contactId: string; engagementStatus: string }) {
  const session = await getUserSession();
  if (!session || session.role !== "marketer") return { ok: false as const, message: "Marketer access is required." };
  if (!UUID_PATTERN.test(value.accountId) || !UUID_PATTERN.test(value.contactId) || !CONTACT_STATUSES.includes(value.engagementStatus as typeof CONTACT_STATUSES[number])) return { ok: false as const, message: "Select a valid contact status." };
  const status = value.engagementStatus as typeof CONTACT_STATUSES[number];
  const updated = await getDatabasePool().query<{ last_contacted_at: Date | null }>(
    `UPDATE account_contacts
     SET engagement_status=$3, last_contacted_at=CASE WHEN $3 IN ('contacted','replied','meeting_booked') THEN now() ELSE last_contacted_at END
     WHERE id=$2 AND account_id=$1 RETURNING last_contacted_at`,
    [value.accountId, value.contactId, status],
  );
  if (!updated.rowCount) return { ok: false as const, message: "Contact not found." };
  await getDatabasePool().query("INSERT INTO activity_events (account_id,actor_email,event_type,details) VALUES ($1,$2,'contact_status_updated',jsonb_build_object('contactId',$3::text,'status',$4::text))", [value.accountId, session.email, value.contactId, status]);
  revalidatePath(`/accounts/${value.accountId}`);
  return { ok: true as const, message: "Buying-committee status updated.", status, lastContactedAt: updated.rows[0].last_contacted_at?.toISOString() ?? null };
}

export async function addAccountNoteAction(accountId: string, bodyValue: string) {
  const session = await getUserSession();
  if (!session || session.role !== "marketer") return { ok: false as const, message: "Marketer access is required." };
  const body = bodyValue.trim();
  if (!UUID_PATTERN.test(accountId) || body.length < 2 || body.length > 2_000) return { ok: false as const, message: "Note must be 2–2,000 characters." };
  const result = await getDatabasePool().query<{ id: string; created_at: Date }>(
    `INSERT INTO account_notes (account_id,body,author_user_id)
     SELECT id,$2,$3 FROM accounts WHERE id=$1 RETURNING id::text,created_at`, [accountId, body, session.userId],
  );
  if (!result.rowCount) return { ok: false as const, message: "Account not found." };
  await getDatabasePool().query("INSERT INTO activity_events (account_id,actor_email,event_type,details) VALUES ($1,$2,'note_added',jsonb_build_object('preview',left($3::text,120)))", [accountId, session.email, body]);
  revalidatePath(`/accounts/${accountId}`);
  return { ok: true as const, message: "Note added.", note: { id: result.rows[0].id, body, authorName: session.name, createdAt: result.rows[0].created_at.toISOString() } };
}

export async function logSalesActivityAction(value: { accountId: string; activityType: string; summary: string; nextStep?: string; dueAt?: string }) {
  const session = await getUserSession();
  if (!session || session.role !== "marketer") return { ok: false as const, message: "Marketer access is required." };
  const types = ["call_logged", "email_logged", "meeting_booked", "commercial_note"] as const;
  const summary = value.summary.trim();
  const nextStep = value.nextStep?.trim() ?? "";
  if (!UUID_PATTERN.test(value.accountId) || !types.includes(value.activityType as typeof types[number]) || summary.length < 3 || summary.length > 2_000 || nextStep.length > 200) return { ok: false as const, message: "Add a valid activity summary." };
  const pool = getDatabasePool();
  const account = await pool.query<{ id: string }>("SELECT id::text FROM accounts WHERE id=$1", [value.accountId]);
  if (!account.rowCount) return { ok: false as const, message: "Account not found." };
  await pool.query(
    "INSERT INTO activity_events (account_id,actor_email,event_type,details) VALUES ($1,$2,$3,jsonb_build_object('summary',$4::text,'nextStep',$5::text))",
    [value.accountId, session.email, value.activityType, summary, nextStep || null],
  );
  if (nextStep) {
    await pool.query(
      "INSERT INTO crm_tasks (account_id,title,description,assignee_email,due_at) VALUES ($1,$2,$3,$4,$5)",
      [value.accountId, nextStep, `Created from ${value.activityType.replaceAll("_", " ")}: ${summary}`, session.email, value.dueAt || null],
    );
  }
  revalidatePath(`/accounts/${value.accountId}`);
  revalidatePath("/sales-workspace");
  return { ok: true as const, message: nextStep ? "Activity logged and next step scheduled." : "Sales activity logged." };
}
