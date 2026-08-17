"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { generateOutreachDraft } from "@/data/outreach";

export async function generateOutreachAction(accountId: string) {
  try {
    const generatedBy = process.env.REVIEWER_EMAIL?.trim();
    if (!generatedBy) return { ok: false as const, message: "The server user identity is not configured." };
    const result = await generateOutreachDraft(accountId, generatedBy);
    if (result.status === "account_not_found") return { ok: false as const, message: "This account no longer exists." };
    if (result.status === "signal_required") return { ok: false as const, message: "An approved signal is required before generating outreach." };
    revalidatePath(`/accounts/${accountId}`);
    return { ok: true as const, message: "Outreach draft generated for human review.", draft: result.draft };
  } catch (error) {
    console.error("Failed to generate outreach", error);
    return { ok: false as const, message: "The outreach draft could not be generated." };
  }
}
