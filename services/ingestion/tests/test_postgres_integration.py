from __future__ import annotations

import json
import os
import pathlib
import sys
import unittest

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from sinks import PostgresSignalSink


@unittest.skipUnless(os.getenv("TEST_DATABASE_URL"), "TEST_DATABASE_URL is not set")
class PostgresIntegrationTests(unittest.TestCase):
    source_name = "ASCRM-30 verification"
    source_url = "https://example.invalid/ascrm-30/feed"
    evidence_url = "https://example.invalid/ascrm-30/signal-1"
    company_name = "ASCRM-30 Verification Corp"

    def setUp(self) -> None:
        import psycopg

        self.psycopg = psycopg
        self.database_url = os.environ["TEST_DATABASE_URL"]
        self._cleanup()

    def tearDown(self) -> None:
        self._cleanup()

    def _cleanup(self) -> None:
        with self.psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    DELETE FROM signals
                    WHERE source_id IN (
                      SELECT id FROM signal_sources WHERE name = %s AND source_url = %s
                    )
                    """,
                    (self.source_name, self.source_url),
                )
                cursor.execute(
                    "DELETE FROM signal_sources WHERE name = %s AND source_url = %s",
                    (self.source_name, self.source_url),
                )
                cursor.execute(
                    "DELETE FROM companies WHERE normalized_name IN (%s, %s)",
                    ("ascrm 30 verification", "ascrm 30 verification corp"),
                )

    def test_reprocessing_updates_one_signal_and_one_evidence_record(self) -> None:
        sink = PostgresSignalSink(
            self.database_url,
            self.source_name,
            self.source_url,
        )
        row = {
            "category": "investment",
            "news_title": "Verification Corp announces $120M investment",
            "provider_name": self.company_name,
            "country": "Switzerland",
            "investment_usd_m": 120,
            "publish_date": "15 Aug 2026",
            "link": self.evidence_url,
        }

        self.assertEqual(sink.write([row]), 1)
        row["investment_usd_m"] = 125
        row["provider_name"] = "The ASCRM-30 Verification Corporation"
        self.assertEqual(sink.write([row]), 1)

        with self.psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT s.investment_usd_millions, s.opportunity_score,
                           s.score_explanation, s.raw_payload,
                           (SELECT count(*) FROM signal_evidence e WHERE e.signal_id = s.id),
                           (SELECT count(*) FROM companies c
                            WHERE c.normalized_name = 'ascrm 30 verification')
                    FROM signals s
                    JOIN signal_sources source ON source.id = s.source_id
                    WHERE source.name = %s AND source.source_url = %s
                    """,
                    (self.source_name, self.source_url),
                )
                records = cursor.fetchall()

        self.assertEqual(len(records), 1)
        self.assertEqual(float(records[0][0]), 125.0)
        self.assertEqual(records[0][1], 68)
        self.assertIn("Reported investment: USD 125 million", records[0][2])
        self.assertIn("Score: 68/100", records[0][2])
        payload = records[0][3]
        if isinstance(payload, str):
            payload = json.loads(payload)
        self.assertEqual(payload["version"], "1.3")
        self.assertEqual(payload["score_version"], "1.0")
        self.assertEqual(records[0][4], 1)
        self.assertEqual(records[0][5], 1)


if __name__ == "__main__":
    unittest.main()
