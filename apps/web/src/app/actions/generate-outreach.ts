"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { generateOutreachDraft, markOutreachSent } from "@/data/outreach";
import { getCurrentActorEmail } from "@/data/runtime-config";

export async function generateOutreachAction(accountId: string, recipient?: { name: string; role: string }) {
  try {
    const generatedBy = await getCurrentActorEmail();
    if (!generatedBy) return { ok: false as const, message: "The server user identity is not configured." };
    const result = await generateOutreachDraft(accountId, generatedBy, recipient && recipient.name.trim() ? { name: recipient.name.trim().slice(0, 160), role: recipient.role.trim().slice(0, 80) } : undefined);
    if (result.status === "account_not_found") return { ok: false as const, message: "This account no longer exists." };
    if (result.status === "signal_required") return { ok: false as const, message: "An approved signal is required before generating outreach." };
    revalidatePath(`/accounts/${accountId}`);
    return { ok: true as const, message: "Outreach draft generated for human review.", draft: result.draft };
  } catch (error) {
    console.error("Failed to generate outreach", error);
    return { ok: false as const, message: "The outreach draft could not be generated." };
  }
}

export async function markOutreachSentAction(draftId: string) {
  try {
    const actor = await getCurrentActorEmail();
    if (!actor) return { ok: false as const, message: "The server user identity is not configured." };
    const result = await markOutreachSent(draftId, actor);
    if (result.status === "not_found") return { ok: false as const, message: "This outreach draft no longer exists." };
    revalidatePath(`/accounts/${result.accountId}`);
    return { ok: true as const, message: "Outreach marked as sent and recorded in activity.", sentAt: result.sentAt };
  } catch (error) {
    console.error("Failed to mark outreach sent", error);
    return { ok: false as const, message: "The outreach status could not be updated." };
  }
}
