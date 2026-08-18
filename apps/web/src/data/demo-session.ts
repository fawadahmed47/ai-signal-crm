import "server-only";

import { cookies } from "next/headers";

export type DemoRole = "manager" | "marketer";
export type DemoSession = { email: string; name: string; role: DemoRole };

const sessionCookie = "signal_crm_demo_session";

const users: Record<DemoRole, DemoSession & { password: string }> = {
  manager: { email: "manager@mamahealth.demo", name: "Alex Morgan", role: "manager", password: "Manager2026!" },
  marketer: { email: "marketer@mamahealth.demo", name: "Jamie Smith", role: "marketer", password: "Marketer2026!" },
};

export async function getDemoSession(): Promise<DemoSession | null> {
  const value = (await cookies()).get(sessionCookie)?.value;
  if (value !== "manager" && value !== "marketer") return null;
  const user = users[value];
  return { email: user.email, name: user.name, role: user.role };
}

export async function signInDemoUser(role: string, password: string): Promise<DemoSession | null> {
  if (role !== "manager" && role !== "marketer") return null;
  const user = users[role];
  if (password !== user.password) return null;
  (await cookies()).set(sessionCookie, role, { httpOnly: true, sameSite: "lax", path: "/" });
  return { email: user.email, name: user.name, role: user.role };
}

export async function signOutDemoUser() {
  (await cookies()).delete(sessionCookie);
}
