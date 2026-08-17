import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { Pool } from "pg";

import { saveOpportunity } from "./opportunity-core";

const connectionString = process.env.TEST_DATABASE_URL;

test(
  "creates and progresses an opportunity in PostgreSQL",
  { skip: !connectionString },
  async () => {
    const pool = new Pool({ connectionString });
    const suffix = randomUUID();
    let companyId: string | undefined;
    let accountId: string | undefined;
    let opportunityId: string | undefined;

    try {
      const company = await pool.query<{ id: string }>(
        `INSERT INTO companies (canonical_name, normalized_name)
         VALUES ($1, $2)
         RETURNING id::text`,
        [`ASCRM-18 test ${suffix}`, `ascrm-18-test-${suffix}`],
      );
      companyId = company.rows[0].id;
      const account = await pool.query<{ id: string }>(
        `INSERT INTO accounts (company_id, owner_email)
         VALUES ($1, 'owner@example.com')
         RETURNING id::text`,
        [companyId],
      );
      accountId = account.rows[0].id;

      const created = await saveOpportunity(
        pool,
        {
          accountId,
          name: "ASCRM-18 integration opportunity",
          stage: "identified",
          amountUsd: 1_250_000,
          probability: 30,
        },
        "Owner@Example.com",
      );
      assert.equal(created.status, "created");
      if (created.status !== "created") return;
      opportunityId = created.opportunityId;

      const updated = await saveOpportunity(
        pool,
        {
          opportunityId,
          accountId,
          name: "ASCRM-18 integration opportunity",
          stage: "proposal",
          amountUsd: 1_500_000,
          probability: 70,
          expectedCloseDate: "2027-06-30",
        },
        "different@example.com",
      );
      assert.equal(updated.status, "updated");

      const persisted = await pool.query<{
        stage: string;
        amount_usd: string;
        probability: number;
        owner_email: string;
        expected_close_date: string;
      }>(
        `SELECT stage::text, amount_usd::text, probability, owner_email,
                expected_close_date::text
         FROM opportunities WHERE id = $1`,
        [opportunityId],
      );
      assert.deepEqual(persisted.rows, [{
        stage: "proposal",
        amount_usd: "1500000.00",
        probability: 70,
        owner_email: "owner@example.com",
        expected_close_date: "2027-06-30",
      }]);
    } finally {
      if (opportunityId) await pool.query("DELETE FROM opportunities WHERE id = $1", [opportunityId]);
      if (accountId) await pool.query("DELETE FROM accounts WHERE id = $1", [accountId]);
      if (companyId) await pool.query("DELETE FROM companies WHERE id = $1", [companyId]);
      await pool.end();
    }
  },
);
