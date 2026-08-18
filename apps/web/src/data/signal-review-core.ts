export type ReviewDecision = "approved" | "rejected";

export type ReviewSignalInput = {
  signalId: string;
  decision: ReviewDecision;
  reason?: string;
};

export type ReviewResult =
  | {
      status: "recorded";
      signalId: string;
      decision: ReviewDecision;
      accountId?: string;
      accountCreated?: boolean;
    }
  | { status: "not_found" }
  | { status: "company_required" }
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
    const updated = await client.query<{ id: string; company_id: string | null }>(
      `UPDATE signals
       SET status = $2,
           lifecycle_stage = CASE WHEN $2 = 'approved' THEN 'sales_accepted'::commercial_lifecycle_stage ELSE 'lost'::commercial_lifecycle_stage END,
           updated_at = now()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, company_id::text`,
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

    const companyId = updated.rows[0].company_id;
    if (input.decision === "approved" && !companyId) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return { status: "company_required" };
    }

    await client.query(
      `INSERT INTO signal_reviews (signal_id, decision, reviewer_email, reason)
       VALUES ($1, $2, $3, $4)`,
      [input.signalId, input.decision, reviewerEmail, input.reason ?? null],
    );

    let accountId: string | undefined;
    let accountCreated: boolean | undefined;
    if (input.decision === "approved" && companyId) {
      const insertedAccount = await client.query<{ id: string }>(
        `INSERT INTO accounts (company_id, owner_email, created_from_signal_id, commercial_lifecycle_stage)
         VALUES ($1, $2, $3, 'sales_accepted')
         ON CONFLICT (company_id) DO NOTHING
         RETURNING id::text`,
        [companyId, reviewerEmail, input.signalId],
      );
      accountCreated = insertedAccount.rowCount === 1;
      if (accountCreated) {
        accountId = insertedAccount.rows[0].id;
      } else {
        const existingAccount = await client.query<{ id: string }>(
          "SELECT id::text FROM accounts WHERE company_id = $1",
          [companyId],
        );
        accountId = existingAccount.rows[0]?.id;
        if (!accountId) throw new Error("Company account could not be resolved.");
      }
    }

    await client.query("COMMIT");
    transactionOpen = false;
    return {
      status: "recorded",
      signalId: input.signalId,
      decision: input.decision,
      ...(accountId ? { accountId, accountCreated } : {}),
    };
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
