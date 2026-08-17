"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import {
  OpportunityValidationError,
  parseOpportunityInput,
  type SaveOpportunityInput,
} from "@/data/opportunity-core";
import { persistOpportunity } from "@/data/opportunities";

export type SaveOpportunityActionResult = { ok: boolean; message: string };

export async function saveOpportunityAction(
  value: SaveOpportunityInput,
): Promise<SaveOpportunityActionResult> {
  try {
    const input = parseOpportunityInput(value);
    const ownerEmail = process.env.REVIEWER_EMAIL?.trim();
    if (!ownerEmail) return { ok: false, message: "The server owner identity is not configured." };

    const result = await persistOpportunity(input, ownerEmail);
    if (result.status === "account_not_found") {
      return { ok: false, message: "The selected account no longer exists." };
    }
    if (result.status === "opportunity_not_found") {
      return { ok: false, message: "This opportunity no longer exists." };
    }

    revalidatePath("/opportunities");
    return {
      ok: true,
      message: result.status === "created" ? "Opportunity created." : "Opportunity updated.",
    };
  } catch (error) {
    if (error instanceof OpportunityValidationError) return { ok: false, message: error.message };
    console.error("Failed to save opportunity", error);
    return { ok: false, message: "The opportunity could not be saved. Please try again." };
  }
}
