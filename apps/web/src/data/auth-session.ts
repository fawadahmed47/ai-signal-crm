import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { getDatabasePool } from "@/data/db";

export type UserRole = "manager" | "marketer";
export type UserSession = { userId: string; email: string; name: string; role: UserRole };

const sessionCookie = "signal_crm_session";
const sessionDurationMs = 8 * 60 * 60 * 1000;

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function getUserSession(): Promise<UserSession | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const result = await getDatabasePool().query<{
    user_id: string; email: string; display_name: string; role: UserRole;
  }>(
    `SELECT u.id::text AS user_id,u.email,u.display_name,u.role
     FROM user_sessions s JOIN app_users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true`,
    [hashToken(token)],
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return { userId: row.user_id, email: row.email, name: row.display_name, role: row.role };
}

export async function signInUser(emailValue: string, password: string): Promise<UserSession | null> {
  const email = emailValue.trim().toLowerCase();
  const result = await getDatabasePool().query<{
    id: string; email: string; display_name: string; role: UserRole;
  }>(
    `SELECT id::text,email,display_name,role FROM app_users
     WHERE email=$1 AND active=true AND password_hash=crypt($2,password_hash)`,
    [email, password],
  );
  if (!result.rowCount) return null;
  const user = result.rows[0];
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  await getDatabasePool().query(
    "INSERT INTO user_sessions (user_id,token_hash,expires_at) VALUES ($1,$2,$3)",
    [user.id, hashToken(token), expiresAt],
  );
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return { userId: user.id, email: user.email, name: user.display_name, role: user.role };
}

export async function signOutUser() {
  const store = await cookies();
  const token = store.get(sessionCookie)?.value;
  if (token) await getDatabasePool().query("DELETE FROM user_sessions WHERE token_hash=$1", [hashToken(token)]);
  store.delete(sessionCookie);
}
