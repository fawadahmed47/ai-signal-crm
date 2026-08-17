export type ReviewDecision = "approved" | "rejected";

export type ReviewSignalInput = {
  signalId: string;
  decision: ReviewDecision;
  reason?: string;
};

export type ReviewResult =
  | { status: "recorded"; signalId: string; decision: ReviewDecision }
  | { status: "not_found" }
  | { status: "already_reviewed"; decision: string };

type QueryResult<Row> = { rows: Row[]; rowCount: number | null };

export interface ReviewDatabaseClient {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
  release(): void;
}

export interface ReviewDatabase {
  connect(): Promise<ReviewDatabaseClient>;
}

export class ReviewValidationError extends Error {}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseReviewInput(value: unknown): ReviewSignalInput {
  if (!value || typeof value !== "object") {
    throw new ReviewValidationError("Review input is required.");
  }

  const candidate = value as Record<string, unknown>;
  const signalId = typeof candidate.signalId === "string" ? candidate.signalId.trim() : "";
  const decision = candidate.decision;
  const reason = typeof candidate.reason === "string" ? candidate.reason.trim() : "";

  if (!UUID_PATTERN.test(signalId)) {
    throw new ReviewValidationError("A valid signal ID is required.");
  }
  if (decision !== "approved" && decision !== "rejected") {
    throw new ReviewValidationError("Decision must be approved or rejected.");
  }
  if (reason.length > 1_000) {
    throw new ReviewValidationError("Review notes cannot exceed 1,000 characters.");
  }
  if (decision === "rejected" && !reason) {
    throw new ReviewValidationError("A reason is required when dismissing a signal.");
  }

  return { signalId, decision, reason: reason || undefined };
}

export function validateReviewerEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !EMAIL_PATTERN.test(email)) {
    throw new ReviewValidationError("A valid server-configured reviewer email is required.");
  }
  return email;
}

export async function recordSignalReview(
  database: ReviewDatabase,
  inputValue: unknown,
  reviewerValue: string,
): Promise<ReviewResult> {
  const input = parseReviewInput(inputValue);
  const reviewerEmail = validateReviewerEmail(reviewerValue);
  const client = await database.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const updated = await client.query<{ id: string }>(
      `UPDATE signals
       SET status = $2, updated_at = now()
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [input.signalId, input.decision],
    );

    if (updated.rowCount === 0) {
      const existing = await client.query<{ status: string }>(
        "SELECT status::text AS status FROM signals WHERE id = $1",
        [input.signalId],
      );
      await client.query("ROLLBACK");
      transactionOpen = false;
      return existing.rowCount === 0
        ? { status: "not_found" }
        : { status: "already_reviewed", decision: existing.rows[0].status };
    }

    await client.query(
      `INSERT INTO signal_reviews (signal_id, decision, reviewer_email, reason)
       VALUES ($1, $2, $3, $4)`,
      [input.signalId, input.decision, reviewerEmail, input.reason ?? null],
    );
    await client.query("COMMIT");
    transactionOpen = false;
    return { status: "recorded", signalId: input.signalId, decision: input.decision };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original database error.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
