#!/usr/bin/env python3
"""Scheduled ingestion worker for self-hosted and local environments."""

from __future__ import annotations

import os
import time

import psycopg

import main


def signal_count(connection: psycopg.Connection) -> int:
    return int(connection.execute("SELECT count(*) FROM signals").fetchone()[0])


def run_tracked_import() -> None:
    database_url = os.environ["DATABASE_URL"]
    source_name = os.getenv("SIGNAL_SOURCE_NAME", "Data Center Dynamics")
    with psycopg.connect(database_url, autocommit=True) as connection:
        source = connection.execute(
            "SELECT id FROM signal_sources WHERE name=%s ORDER BY created_at LIMIT 1",
            (source_name,),
        ).fetchone()
        run_id = connection.execute(
            "INSERT INTO ingestion_runs (source_id,status) VALUES (%s,'running') RETURNING id",
            (source[0] if source else None,),
        ).fetchone()[0]
        before = signal_count(connection)
        try:
            main.main()
            imported = max(0, signal_count(connection) - before)
            connection.execute(
                "UPDATE ingestion_runs SET status='succeeded',imported_count=%s,finished_at=now() WHERE id=%s",
                (imported, run_id),
            )
        except Exception as error:
            connection.execute(
                "UPDATE ingestion_runs SET status='failed',error_message=%s,finished_at=now() WHERE id=%s",
                (str(error)[:1000], run_id),
            )
            raise


def main_loop() -> None:
    interval = max(300, int(os.getenv("INGESTION_INTERVAL_SECONDS", "21600")))
    run_once = os.getenv("INGESTION_RUN_ONCE", "false").lower() == "true"
    while True:
        try:
            run_tracked_import()
        except Exception as error:
            print(f"Scheduled ingestion failed: {error}", flush=True)
        if run_once:
            return
        time.sleep(interval)


if __name__ == "__main__":
    main_loop()
