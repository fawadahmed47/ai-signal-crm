"""Output adapters for extracted signal rows."""

from __future__ import annotations

import csv
import pathlib
from typing import Any, Callable, Iterable, Mapping, Optional, Protocol, Sequence

from contracts import SignalContract


class SignalSink(Protocol):
    def write(self, rows: Sequence[Mapping[str, Any]]) -> int:
        """Persist rows and return the number accepted by the adapter."""


class CsvSignalSink:
    def __init__(self, output_file: pathlib.Path, fields: Iterable[str]) -> None:
        self.output_file = output_file
        self.fields = list(fields)

    def write(self, rows: Sequence[Mapping[str, Any]]) -> int:
        file_exists = self.output_file.exists()
        with self.output_file.open("a", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=self.fields)
            if not file_exists:
                writer.writeheader()
            for row in rows:
                writer.writerow({field: row.get(field) for field in self.fields})
        return len(rows)


class PostgresSignalSink:
    """Idempotently persists signal contracts and their source evidence."""

    def __init__(
        self,
        database_url: str,
        source_name: str,
        source_url: str,
        connect: Optional[Callable[..., Any]] = None,
    ) -> None:
        if not database_url:
            raise ValueError("DATABASE_URL is required for the PostgreSQL sink")
        self.database_url = database_url
        self.source_name = source_name
        self.source_url = source_url
        self._connect = connect

    def _connection(self) -> Any:
        if self._connect:
            return self._connect(self.database_url)
        try:
            import psycopg  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "psycopg is required for PostgreSQL output; install ingestion requirements"
            ) from exc
        return psycopg.connect(self.database_url)

    def write(self, rows: Sequence[Mapping[str, Any]]) -> int:
        contracts = [
            SignalContract.from_extracted_row(row)
            for row in rows
            if row.get("category") != "error"
        ]
        if not contracts:
            return 0

        with self._connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO signal_sources (name, source_type, source_url)
                    VALUES (%s, 'rss', %s)
                    ON CONFLICT (name, source_url) DO UPDATE SET name = EXCLUDED.name
                    RETURNING id
                    """,
                    (self.source_name, self.source_url),
                )
                source_id = cursor.fetchone()[0]

                for contract in contracts:
                    company_id = None
                    if contract.company_name and contract.normalized_company_name:
                        cursor.execute(
                            """
                            WITH matched_alias AS (
                              SELECT company_id
                              FROM company_aliases
                              WHERE normalized_alias = %s
                            ), upserted_company AS (
                              INSERT INTO companies (canonical_name, normalized_name)
                              SELECT %s, %s
                              WHERE NOT EXISTS (SELECT 1 FROM matched_alias)
                              ON CONFLICT (normalized_name) DO UPDATE
                                SET normalized_name = EXCLUDED.normalized_name
                              RETURNING id
                            ), resolved_company AS (
                              SELECT company_id AS id FROM matched_alias
                              UNION ALL
                              SELECT id FROM upserted_company
                              LIMIT 1
                            )
                            INSERT INTO company_aliases (
                              company_id, alias_name, normalized_alias
                            )
                            SELECT id, %s, %s FROM resolved_company
                            ON CONFLICT (normalized_alias) DO UPDATE
                              SET alias_name = EXCLUDED.alias_name
                            RETURNING company_id
                            """,
                            (
                                contract.normalized_company_name,
                                contract.company_name,
                                contract.normalized_company_name,
                                contract.company_name,
                                contract.normalized_company_name,
                            ),
                        )
                        company_id = cursor.fetchone()[0]

                    cursor.execute(
                        """
                        INSERT INTO signals (
                          source_id, company_id, external_id, title, category, summary,
                          location_text, power_capacity_mw, investment_usd_millions,
                          published_at, raw_payload
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                        ON CONFLICT (source_id, external_id) DO UPDATE SET
                          company_id = EXCLUDED.company_id,
                          title = EXCLUDED.title,
                          category = EXCLUDED.category,
                          summary = EXCLUDED.summary,
                          location_text = EXCLUDED.location_text,
                          power_capacity_mw = EXCLUDED.power_capacity_mw,
                          investment_usd_millions = EXCLUDED.investment_usd_millions,
                          published_at = EXCLUDED.published_at,
                          raw_payload = EXCLUDED.raw_payload,
                          updated_at = now()
                        RETURNING id
                        """,
                        (
                            source_id,
                            company_id,
                            contract.external_id,
                            contract.title,
                            contract.category,
                            contract.summary,
                            contract.location_text,
                            contract.power_capacity_mw,
                            contract.investment_usd_millions,
                            contract.published_at,
                            contract.json_payload(),
                        ),
                    )
                    signal_id = cursor.fetchone()[0]

                    if contract.evidence_url:
                        cursor.execute(
                            """
                            INSERT INTO signal_evidence (signal_id, url, label)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (signal_id, url) DO UPDATE
                              SET label = EXCLUDED.label
                            """,
                            (signal_id, contract.evidence_url, contract.title),
                        )

        return len(contracts)
