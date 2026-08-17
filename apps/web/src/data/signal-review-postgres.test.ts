import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { Pool } from "pg";

import { recordSignalReview } from "./signal-review-core";

const connectionString = process.env.TEST_DATABASE_URL;

test(
  "persists one review and prevents a second decision in PostgreSQL",
  { skip: !connectionString },
  async () => {
    const pool = new Pool({ connectionString });
    const suffix = randomUUID();
    let sourceId: string | undefined;
    let signalId: string | undefined;

    try {
      const source = await pool.query<{ id: string }>(
        `INSERT INTO signal_sources (name, source_type, source_url)
         VALUES ($1, 'manual', $2)
         RETURNING id::text`,
        [`ASCRM-15 test ${suffix}`, `https://example.test/${suffix}`],
      );
      sourceId = source.rows[0].id;

      const signal = await pool.query<{ id: string }>(
        `INSERT INTO signals (source_id, external_id, title, category, summary)
         VALUES ($1, $2, 'ASCRM-15 review test', 'test', 'Temporary integration-test signal')
         RETURNING id::text`,
        [sourceId, suffix],
      );
      signalId = signal.rows[0].id;

      const first = await recordSignalReview(
        pool,
        { signalId, decision: "rejected", reason: "Duplicate evidence" },
        "Reviewer@Example.com",
      );
      assert.equal(first.status, "recorded");

      const persisted = await pool.query<{
        status: string;
        decision: string;
        reviewer_email: string;
        reason: string;
      }>(
        `SELECT s.status::text, r.decision::text, r.reviewer_email, r.reason
         FROM signals s
         JOIN signal_reviews r ON r.signal_id = s.id
         WHERE s.id = $1`,
        [signalId],
      );
      assert.deepEqual(persisted.rows, [
        {
          status: "rejected",
          decision: "rejected",
          reviewer_email: "reviewer@example.com",
          reason: "Duplicate evidence",
        },
      ]);

      const second = await recordSignalReview(
        pool,
        { signalId, decision: "approved" },
        "reviewer@example.com",
      );
      assert.deepEqual(second, { status: "already_reviewed", decision: "rejected" });
    } finally {
      if (signalId) await pool.query("DELETE FROM signals WHERE id = $1", [signalId]);
      if (sourceId) await pool.query("DELETE FROM signal_sources WHERE id = $1", [sourceId]);
      await pool.end();
    }
  },
);
