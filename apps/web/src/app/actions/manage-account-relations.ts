"use server";

import { revalidatePath } from "next/cache";

import { getUserSession } from "@/data/auth-session";
import { getDatabasePool } from "@/data/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function addContactAction(value: { accountId: string; fullName: string; jobTitle: string; email: string; phone: string }) {
  const session = await getUserSession();
  if (!session || session.role !== "marketer") return { ok: false as const, message: "Marketer access is required." };
  const name = value.fullName.trim(); const email = value.email.trim().toLowerCase();
  if (!UUID_PATTERN.test(value.accountId) || name.length < 2 || name.length > 160) return { ok: false as const, message: "Enter a valid contact name." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, message: "Enter a valid contact email." };
  const result = await getDatabasePool().query<{ id: string; created_at: Date }>(
    `INSERT INTO account_contacts (account_id,full_name,job_title,email,phone,created_by_user_id)
     SELECT id,$2,$3,$4,$5,$6 FROM accounts WHERE id=$1 RETURNING id::text,created_at`,
    [value.accountId, name, value.jobTitle.trim() || null, email || null, value.phone.trim() || null, session.userId],
  );
  if (!result.rowCount) return { ok: false as const, message: "Account not found." };
  await getDatabasePool().query("INSERT INTO activity_events (account_id,actor_email,event_type,details) VALUES ($1,$2,'contact_added',jsonb_build_object('name',$3::text))", [value.accountId, session.email, name]);
  revalidatePath(`/accounts/${value.accountId}`);
  return { ok: true as const, message: "Contact added.", contact: { id: result.rows[0].id, fullName: name, jobTitle: value.jobTitle.trim() || null, email: email || null, phone: value.phone.trim() || null, createdAt: result.rows[0].created_at.toISOString() } };
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
