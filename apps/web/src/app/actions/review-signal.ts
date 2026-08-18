"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import {
  parseReviewInput,
  ReviewValidationError,
  type ReviewSignalInput,
} from "@/data/signal-review-core";
import { saveSignalReview } from "@/data/signal-reviews";
import { getCurrentActorEmail } from "@/data/runtime-config";
import { getUserSession } from "@/data/auth-session";

export type ReviewSignalActionResult = {
  ok: boolean;
  message: string;
};

export async function reviewSignalAction(
  value: ReviewSignalInput,
): Promise<ReviewSignalActionResult> {
  try {
    const session = await getUserSession();
    if (session?.role === "manager") return { ok: false, message: "Manager access is read-only. Sign in as a marketer to review signals." };
    const input = parseReviewInput(value);
    const reviewerEmail = await getCurrentActorEmail();
    if (!reviewerEmail) {
      return { ok: false, message: "The server reviewer identity is not configured." };
    }

    const result = await saveSignalReview(input, reviewerEmail);
    if (result.status === "not_found") {
      return { ok: false, message: "This signal no longer exists." };
    }
    if (result.status === "company_required") {
      return {
        ok: false,
        message: "Match this signal to a company before approving it as an account.",
      };
    }
    if (result.status === "already_reviewed") {
      return {
        ok: false,
        message: `This signal was already ${result.decision}. Refresh the inbox.`,
      };
    }

    revalidatePath("/");
    return {
      ok: true,
      message:
        result.decision === "approved"
          ? result.accountCreated
            ? "Signal approved and account created."
            : "Signal approved and linked to the existing account."
          : "Signal dismissed and feedback recorded.",
    };
  } catch (error) {
    if (error instanceof ReviewValidationError) {
      return { ok: false, message: error.message };
    }
    console.error("Failed to record signal review", error);
    return { ok: false, message: "The review could not be saved. Please try again." };
  }
}
