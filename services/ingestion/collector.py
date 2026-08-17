#!/usr/bin/env python3
"""
collector.py - resilient RSS/URL collector (v2)
- Stores "seen" URLs in SQLite with processed flag
- Returns fresh, unprocessed items for downstream fetch/NER
"""

from __future__ import annotations

import pathlib
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Dict, Generator, List

try:
    import feedparser  # type: ignore
except Exception:
    feedparser = None

DB_PATH = str(pathlib.Path(__file__).with_name("seen.db"))
LOG_FILE = pathlib.Path(__file__).with_name("collector.log")

# Configure your feeds here.
FEEDS: List[str] = [
    "https://www.datacenterdynamics.com/en/rss/",
]

MAX_LINKS = 100
DAYS_KEEP = 7
VERBOSE = True


def _init_db() -> None:
    """Create the URL tracking database if it does not already exist."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS seen (
                url TEXT PRIMARY KEY,
                first_seen TEXT,
                processed INTEGER DEFAULT 0
            )
            """
        )
        conn.commit()


def _cleanup_old(days_keep: int = DAYS_KEEP) -> None:
    """Prepare optional cleanup logic for old records.

    Cleanup remains disabled to preserve the original project's history.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days_keep)).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        # Optional prune (disabled by default to keep history):
        # conn.execute("DELETE FROM seen WHERE first_seen < ?", (cutoff,))
        _ = cutoff
        conn.commit()


def insert_unprocessed(urls: List[str]) -> None:
    """Insert URLs as not-yet-processed (processed=0)."""
    if not urls:
        return

    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        conn.executemany(
            "INSERT OR IGNORE INTO seen (url, first_seen, processed) VALUES (?, ?, 0)",
            [(url, now) for url in urls],
        )
        conn.commit()


def mark_processed(urls: List[str]) -> None:
    """Mark URLs as processed after successful extraction."""
    if not urls:
        return

    with sqlite3.connect(DB_PATH) as conn:
        conn.executemany(
            "UPDATE seen SET processed = 1 WHERE url = ?",
            [(url,) for url in urls],
        )
        conn.commit()


def _log(message: str) -> None:
    """Append a timestamped message to the collector log."""
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as file:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        file.write(f"[{timestamp}] {message}\n")


def _parse_feed(url: str) -> Generator[Dict, None, None]:
    """Yield normalized entries from one RSS feed."""
    if feedparser is None:
        _log("feedparser not installed; skipping feed parse.")
        return

    try:
        parsed = feedparser.parse(url)
        for entry in parsed.entries:
            link = entry.get("link")
            if not link:
                continue

            yield {
                "title": entry.get("title", ""),
                "url": link,
                "published": entry.get("published", entry.get("updated", "")),
            }
    except Exception as exc:
        _log(f"[ERROR] parsing feed {url}: {exc}")


def collect(max_links: int = MAX_LINKS) -> List[Dict]:
    """Return fresh unprocessed feed items and register new URLs in SQLite."""
    _init_db()
    _cleanup_old(DAYS_KEEP)

    items: List[Dict] = []
    all_urls: List[str] = []

    for feed in FEEDS:
        for entry in _parse_feed(feed):
            url = entry["url"]
            all_urls.append(url)
            items.append(entry)

    # Insert all seen URLs as unprocessed. INSERT OR IGNORE makes this idempotent.
    insert_unprocessed(all_urls)

    # Return only unprocessed URLs so failed items can be retried on the next run.
    fresh: List[Dict] = []
    with sqlite3.connect(DB_PATH) as conn:
        for item in items:
            row = conn.execute(
                "SELECT processed FROM seen WHERE url = ?",
                (item["url"],),
            ).fetchone()
            if not row or row[0] == 0:
                fresh.append(item)

    # Deduplicate by URL and apply the configured cap.
    unique = {item["url"]: item for item in fresh}
    fresh = list(unique.values())[:max_links]

    if VERBOSE:
        _log(
            f"[Collected] {len(fresh)} fresh of {len(items)} total items "
            f"(inserted {len(all_urls)} URLs)."
        )

    return fresh


if __name__ == "__main__":
    print("Testing collector...")
    results = collect()
    print(f"Fresh items: {len(results)}")
    for result in results[:5]:
        print(f"- {result['title'][:80]} :: {result['url']}")
