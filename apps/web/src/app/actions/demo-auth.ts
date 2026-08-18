"use server";

import { redirect } from "next/navigation";

import { signInDemoUser, signOutDemoUser } from "@/data/demo-session";

export async function loginDemoAction(formData: FormData) {
  const session = await signInDemoUser(String(formData.get("role") ?? ""), String(formData.get("password") ?? ""));
  if (!session) redirect("/login?error=1");
  redirect("/");
}

export async function logoutDemoAction() {
  await signOutDemoUser();
  redirect("/login");
}
