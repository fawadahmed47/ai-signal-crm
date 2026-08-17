"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import {
  parseReviewInput,
  ReviewValidationError,
  type ReviewSignalInput,
} from "@/data/signal-review-core";
import { saveSignalReview } from "@/data/signal-reviews";

export type ReviewSignalActionResult = {
  ok: boolean;
  message: string;
};

export async function reviewSignalAction(
  value: ReviewSignalInput,
): Promise<ReviewSignalActionResult> {
  try {
    const input = parseReviewInput(value);
    const reviewerEmail = process.env.REVIEWER_EMAIL?.trim();
    if (!reviewerEmail) {
      return { ok: false, message: "The server reviewer identity is not configured." };
    }

    const result = await saveSignalReview(input, reviewerEmail);
    if (result.status === "not_found") {
      return { ok: false, message: "This signal no longer exists." };
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
          ? "Signal approved. Account creation is handled in the next workflow."
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
