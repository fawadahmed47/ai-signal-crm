import type { OpportunityStage } from "../types/opportunity";

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  "identified",
  "qualified",
  "proposal",
  "won",
  "lost",
];

export type SaveOpportunityInput = {
  opportunityId?: string;
  accountId: string;
  name: string;
  stage: OpportunityStage;
  amountUsd?: number | null;
  probability?: number | null;
  expectedCloseDate?: string | null;
};

export type SaveOpportunityResult =
  | { status: "created" | "updated"; opportunityId: string }
  | { status: "account_not_found" | "opportunity_not_found" };

type QueryResult<Row> = { rows: Row[]; rowCount: number | null };

export interface OpportunityDatabase {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
}

export class OpportunityValidationError extends Error {}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function optionalNumber(value: unknown, label: string, minimum: number, maximum: number) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new OpportunityValidationError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function optionalDate(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new OpportunityValidationError("Expected close date must use YYYY-MM-DD.");
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new OpportunityValidationError("Expected close date is invalid.");
  }
  return value;
}

export function parseOpportunityInput(value: unknown): SaveOpportunityInput {
  if (!value || typeof value !== "object") {
    throw new OpportunityValidationError("Opportunity input is required.");
  }
  const candidate = value as Record<string, unknown>;
  const opportunityId = typeof candidate.opportunityId === "string" ? candidate.opportunityId.trim() : "";
  const accountId = typeof candidate.accountId === "string" ? candidate.accountId.trim() : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const stage = candidate.stage;

  if (opportunityId && !UUID_PATTERN.test(opportunityId)) {
    throw new OpportunityValidationError("A valid opportunity ID is required.");
  }
  if (!UUID_PATTERN.test(accountId)) {
    throw new OpportunityValidationError("Select a valid account.");
  }
  if (!name || name.length > 200) {
    throw new OpportunityValidationError("Opportunity name must contain 1–200 characters.");
  }
  if (!OPPORTUNITY_STAGES.includes(stage as OpportunityStage)) {
    throw new OpportunityValidationError("Select a valid opportunity stage.");
  }

  const amountUsd = optionalNumber(candidate.amountUsd, "Amount", 0, 999_999_999_999.99);
  const probability = optionalNumber(candidate.probability, "Probability", 0, 100);
  if (probability !== null && !Number.isInteger(probability)) {
    throw new OpportunityValidationError("Probability must be a whole number.");
  }

  return {
    ...(opportunityId ? { opportunityId } : {}),
    accountId,
    name,
    stage: stage as OpportunityStage,
    amountUsd,
    probability,
    expectedCloseDate: optionalDate(candidate.expectedCloseDate),
  };
}

export function validateOpportunityOwner(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !EMAIL_PATTERN.test(email)) {
    throw new OpportunityValidationError("A valid server-configured owner email is required.");
  }
  return email;
}

export async function saveOpportunity(
  database: OpportunityDatabase,
  inputValue: unknown,
  ownerValue: string,
): Promise<SaveOpportunityResult> {
  const input = parseOpportunityInput(inputValue);
  const ownerEmail = validateOpportunityOwner(ownerValue);

  if (!input.opportunityId) {
    const created = await database.query<{ id: string }>(
      `INSERT INTO opportunities (
         account_id, name, stage, amount_usd, probability, owner_email, expected_close_date
       )
       SELECT id, $2, $3, $4, $5, $6, $7
       FROM accounts
       WHERE id = $1
       RETURNING id::text`,
      [
        input.accountId,
        input.name,
        input.stage,
        input.amountUsd ?? null,
        input.probability ?? null,
        ownerEmail,
        input.expectedCloseDate ?? null,
      ],
    );
    return created.rowCount === 0
      ? { status: "account_not_found" }
      : { status: "created", opportunityId: created.rows[0].id };
  }

  const updated = await database.query<{ id: string }>(
    `UPDATE opportunities
     SET account_id = $2,
         name = $3,
         stage = $4,
         amount_usd = $5,
         probability = $6,
         expected_close_date = $7,
         updated_at = now()
     WHERE id = $1
     RETURNING id::text`,
    [
      input.opportunityId,
      input.accountId,
      input.name,
      input.stage,
      input.amountUsd ?? null,
      input.probability ?? null,
      input.expectedCloseDate ?? null,
    ],
  );
  return updated.rowCount === 0
    ? { status: "opportunity_not_found" }
    : { status: "updated", opportunityId: updated.rows[0].id };
}
