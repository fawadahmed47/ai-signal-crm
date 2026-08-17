from __future__ import annotations

import csv
import pathlib
import sys
import tempfile
import unittest

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from sinks import CsvSignalSink, PostgresSignalSink


class FakeCursor:
    def __init__(self) -> None:
        self.statements = []
        self._next_id = 1

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=None) -> None:
        self.statements.append((" ".join(query.split()), params))

    def fetchone(self):
        value = self._next_id
        self._next_id += 1
        return (value,)


class FakeConnection:
    def __init__(self) -> None:
        self.fake_cursor = FakeCursor()

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def cursor(self):
        return self.fake_cursor


class SinkTests(unittest.TestCase):
    def test_csv_adapter_retains_legacy_shape(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = pathlib.Path(directory) / "signals.csv"
            sink = CsvSignalSink(output, ["category", "news_title"])
            self.assertEqual(sink.write([{"category": "investment", "news_title": "A"}]), 1)
            with output.open(newline="", encoding="utf-8") as file:
                self.assertEqual(
                    list(csv.DictReader(file)),
                    [{"category": "investment", "news_title": "A"}],
                )

    def test_postgres_sink_upserts_contract_and_evidence(self) -> None:
        connection = FakeConnection()
        sink = PostgresSignalSink(
            "postgresql://example",
            "Test Feed",
            "https://example.com/rss",
            connect=lambda _url: connection,
        )
        written = sink.write(
            [
                {
                    "category": "investment",
                    "news_title": "Acme raises funding",
                    "provider_name": "Acme Corp",
                    "publish_date": "15 Aug 2026",
                    "link": "https://example.com/acme",
                },
                {"category": "error", "link": "https://example.com/error"},
            ]
        )

        sql = "\n".join(statement for statement, _ in connection.fake_cursor.statements)
        self.assertEqual(written, 1)
        self.assertIn("ON CONFLICT (name, source_url)", sql)
        self.assertIn("FROM company_aliases", sql)
        self.assertIn("ON CONFLICT (normalized_name)", sql)
        self.assertIn("ON CONFLICT (normalized_alias)", sql)
        self.assertIn("ON CONFLICT (source_id, external_id)", sql)
        self.assertIn("ON CONFLICT (signal_id, url)", sql)
        self.assertIn("opportunity_score = EXCLUDED.opportunity_score", sql)
        self.assertIn("contract_version", connection.fake_cursor.statements[2][1][-1])

    def test_postgres_sink_requires_database_url(self) -> None:
        with self.assertRaisesRegex(ValueError, "DATABASE_URL"):
            PostgresSignalSink("", "Feed", "https://example.com/rss")


if __name__ == "__main__":
    unittest.main()
