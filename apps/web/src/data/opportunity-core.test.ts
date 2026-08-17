import assert from "node:assert/strict";
import test from "node:test";

import {
  OpportunityValidationError,
  parseOpportunityInput,
  saveOpportunity,
  type OpportunityDatabase,
} from "./opportunity-core";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const OPPORTUNITY_ID = "22222222-2222-4222-8222-222222222222";

class FakeDatabase implements OpportunityDatabase {
  readonly calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  constructor(private readonly rows: Record<string, unknown>[]) {}

  async query<Row extends Record<string, unknown>>(text: string, values?: readonly unknown[]) {
    this.calls.push({ text, values });
    return { rows: this.rows as Row[], rowCount: this.rows.length };
  }
}

test("creates an opportunity for an existing account", async () => {
  const database = new FakeDatabase([{ id: OPPORTUNITY_ID }]);
  const result = await saveOpportunity(
    database,
    {
      accountId: ACCOUNT_ID,
      name: "Frankfurt expansion",
      stage: "qualified",
      amountUsd: 2_500_000,
      probability: 60,
      expectedCloseDate: "2027-03-31",
    },
    "Owner@Example.com",
  );

  assert.deepEqual(result, { status: "created", opportunityId: OPPORTUNITY_ID });
  assert.match(database.calls[0].text, /^INSERT INTO opportunities/);
  assert.deepEqual(database.calls[0].values, [
    ACCOUNT_ID,
    "Frankfurt expansion",
    "qualified",
    2_500_000,
    60,
    "owner@example.com",
    "2027-03-31",
  ]);
});

test("updates opportunity fields without replacing its owner", async () => {
  const database = new FakeDatabase([{ id: OPPORTUNITY_ID }]);
  const result = await saveOpportunity(
    database,
    {
      opportunityId: OPPORTUNITY_ID,
      accountId: ACCOUNT_ID,
      name: "Frankfurt expansion",
      stage: "proposal",
      probability: 75,
    },
    "new-owner@example.com",
  );

  assert.deepEqual(result, { status: "updated", opportunityId: OPPORTUNITY_ID });
  assert.match(database.calls[0].text, /^UPDATE opportunities/);
  assert.equal(database.calls[0].text.includes("owner_email"), false);
});

test("reports a missing account without creating an opportunity", async () => {
  const result = await saveOpportunity(
    new FakeDatabase([]),
    { accountId: ACCOUNT_ID, name: "New opportunity", stage: "identified" },
    "owner@example.com",
  );
  assert.deepEqual(result, { status: "account_not_found" });
});

test("validates probability, dates, names, and identifiers", () => {
  assert.throws(
    () => parseOpportunityInput({ accountId: ACCOUNT_ID, name: "Test", stage: "qualified", probability: 101 }),
    OpportunityValidationError,
  );
  assert.throws(
    () => parseOpportunityInput({ accountId: ACCOUNT_ID, name: "Test", stage: "qualified", expectedCloseDate: "2027-02-30" }),
    /invalid/,
  );
  assert.throws(
    () => parseOpportunityInput({ accountId: "bad-id", name: "", stage: "unknown" }),
    OpportunityValidationError,
  );
});
