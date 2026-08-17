import "server-only";

import { getDatabasePool } from "@/data/db";
import {
  recordSignalReview,
  type ReviewResult,
  type ReviewSignalInput,
} from "@/data/signal-review-core";

export async function saveSignalReview(
  input: ReviewSignalInput,
  reviewerEmail: string,
): Promise<ReviewResult> {
  return recordSignalReview(getDatabasePool(), input, reviewerEmail);
}
