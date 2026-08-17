import assert from "node:assert/strict";
import test from "node:test";

import {
  parseReviewInput,
  recordSignalReview,
  ReviewValidationError,
  type ReviewDatabase,
  type ReviewDatabaseClient,
} from "./signal-review-core";

const SIGNAL_ID = "11111111-1111-4111-8111-111111111111";

class FakeClient implements ReviewDatabaseClient {
  readonly calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  released = false;
  private readonly responses: Array<{ rows: Record<string, unknown>[]; rowCount: number }>;

  constructor(responses: Array<{ rows: Record<string, unknown>[]; rowCount: number }>) {
    this.responses = [...responses];
  }

  async query<Row extends Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount: number }> {
    this.calls.push({ text, values });
    if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") {
      return { rows: [], rowCount: 0 };
    }
    const response = this.responses.shift() ?? { rows: [], rowCount: 0 };
    return response as { rows: Row[]; rowCount: number };
  }

  release() {
    this.released = true;
  }
}

function databaseFor(client: FakeClient): ReviewDatabase {
  return { connect: async () => client };
}

test("records an approved review in one short transaction", async () => {
  const client = new FakeClient([
    { rows: [{ id: SIGNAL_ID }], rowCount: 1 },
    { rows: [], rowCount: 1 },
  ]);

  const result = await recordSignalReview(
    databaseFor(client),
    { signalId: SIGNAL_ID, decision: "approved", reason: "Strong evidence" },
    "Reviewer@Example.com",
  );

  assert.deepEqual(result, { status: "recorded", signalId: SIGNAL_ID, decision: "approved" });
  assert.deepEqual(
    client.calls.map((call) => call.text.trim().split(/\s+/)[0]),
    ["BEGIN", "UPDATE", "INSERT", "COMMIT"],
  );
  assert.deepEqual(client.calls[2].values, [
    SIGNAL_ID,
    "approved",
    "reviewer@example.com",
    "Strong evidence",
  ]);
  assert.equal(client.released, true);
});

test("returns an idempotent conflict without inserting another review", async () => {
  const client = new FakeClient([
    { rows: [], rowCount: 0 },
    { rows: [{ status: "rejected" }], rowCount: 1 },
  ]);

  const result = await recordSignalReview(
    databaseFor(client),
    { signalId: SIGNAL_ID, decision: "approved" },
    "reviewer@example.com",
  );

  assert.deepEqual(result, { status: "already_reviewed", decision: "rejected" });
  assert.deepEqual(
    client.calls.map((call) => call.text.trim().split(/\s+/)[0]),
    ["BEGIN", "UPDATE", "SELECT", "ROLLBACK"],
  );
  assert.equal(client.released, true);
});

test("requires a reason for rejection and rejects malformed IDs", () => {
  assert.throws(
    () => parseReviewInput({ signalId: SIGNAL_ID, decision: "rejected" }),
    ReviewValidationError,
  );
  assert.throws(
    () => parseReviewInput({ signalId: "not-a-uuid", decision: "approved" }),
    ReviewValidationError,
  );
});

test("limits review note length", () => {
  assert.throws(
    () =>
      parseReviewInput({
        signalId: SIGNAL_ID,
        decision: "approved",
        reason: "x".repeat(1_001),
      }),
    /1,000 characters/,
  );
});
