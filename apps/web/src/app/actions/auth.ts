"use server";

import { redirect } from "next/navigation";

import { signInUser, signOutUser } from "@/data/auth-session";

export async function loginAction(formData: FormData) {
  const session = await signInUser(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (!session) redirect("/login?error=1");
  redirect("/");
}

export async function logoutAction() {
  await signOutUser();
  redirect("/login");
}
