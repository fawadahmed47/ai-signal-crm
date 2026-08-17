import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { Pool } from "pg";

import { recordSignalReview } from "./signal-review-core";

const connectionString = process.env.TEST_DATABASE_URL;

test(
  "approves a signal, creates one account, and prevents a second decision in PostgreSQL",
  { skip: !connectionString },
  async () => {
    const pool = new Pool({ connectionString });
    const suffix = randomUUID();
    let sourceId: string | undefined;
    let companyId: string | undefined;
    let signalId: string | undefined;

    try {
      const source = await pool.query<{ id: string }>(
        `INSERT INTO signal_sources (name, source_type, source_url)
         VALUES ($1, 'manual', $2)
         RETURNING id::text`,
        [`ASCRM-15 test ${suffix}`, `https://example.test/${suffix}`],
      );
      sourceId = source.rows[0].id;

      const company = await pool.query<{ id: string }>(
        `INSERT INTO companies (canonical_name, normalized_name)
         VALUES ($1, $2)
         RETURNING id::text`,
        [`ASCRM-17 test ${suffix}`, `ascrm-17-test-${suffix}`],
      );
      companyId = company.rows[0].id;

      const signal = await pool.query<{ id: string }>(
        `INSERT INTO signals (source_id, company_id, external_id, title, category, summary)
         VALUES ($1, $2, $3, 'ASCRM-17 review test', 'test', 'Temporary integration-test signal')
         RETURNING id::text`,
        [sourceId, companyId, suffix],
      );
      signalId = signal.rows[0].id;

      const first = await recordSignalReview(
        pool,
        { signalId, decision: "approved", reason: "Strong commercial signal" },
        "Reviewer@Example.com",
      );
      assert.equal(first.status, "recorded");
      assert.equal(first.accountCreated, true);
      assert.ok(first.accountId);

      const persisted = await pool.query<{
        status: string;
        decision: string;
        reviewer_email: string;
        reason: string;
        account_id: string;
        owner_email: string;
        created_from_signal_id: string;
      }>(
        `SELECT s.status::text, r.decision::text, r.reviewer_email, r.reason,
                a.id::text AS account_id, a.owner_email,
                a.created_from_signal_id::text
         FROM signals s
         JOIN signal_reviews r ON r.signal_id = s.id
         JOIN accounts a ON a.company_id = s.company_id
         WHERE s.id = $1`,
        [signalId],
      );
      assert.deepEqual(persisted.rows, [
        {
          status: "approved",
          decision: "approved",
          reviewer_email: "reviewer@example.com",
          reason: "Strong commercial signal",
          account_id: first.accountId,
          owner_email: "reviewer@example.com",
          created_from_signal_id: signalId,
        },
      ]);

      const second = await recordSignalReview(
        pool,
        { signalId, decision: "approved" },
        "reviewer@example.com",
      );
      assert.deepEqual(second, { status: "already_reviewed", decision: "approved" });
    } finally {
      if (signalId) await pool.query("DELETE FROM signals WHERE id = $1", [signalId]);
      if (companyId) await pool.query("DELETE FROM accounts WHERE company_id = $1", [companyId]);
      if (companyId) await pool.query("DELETE FROM companies WHERE id = $1", [companyId]);
      if (sourceId) await pool.query("DELETE FROM signal_sources WHERE id = $1", [sourceId]);
      await pool.end();
    }
  },
);
