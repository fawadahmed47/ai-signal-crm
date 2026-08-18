import "server-only";

import { getUserSession } from "@/data/auth-session";

const localDemoActor = "jamie.smith@example.com";

/**
 * Production deployments must provide an authenticated user identity.
 * The local demo can use the seeded sales operator when root .env is not
 * automatically loaded by the Next.js app directory.
 */
export async function getCurrentActorEmail(): Promise<string | undefined> {
  const session = await getUserSession();
  if (session) return session.email;
  const configured = process.env.REVIEWER_EMAIL?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === "development" ? localDemoActor : undefined;
}
