#!/usr/bin/env python3
"""
main.py - v5.2
Data Center Project Tracker Pipeline

Integrates:
- collector.py: RSS/news feed collection
- article_fetcher.py: article scraping and extraction
- ner_normalizer.py: LLM-based structured extraction

Features:
- news_title column in CSV
- date normalization
- color-coded logging
- retry system for fetching
- SQLite-based deduplication
"""

from __future__ import annotations

import concurrent.futures
import csv
import os
import pathlib
import re
import time
from datetime import datetime
from typing import Dict, List

os.environ["TRANSFORMERS_NO_TF"] = "1"
os.environ["TRANSFORMERS_NO_KERAS"] = "1"

import article_fetcher
import collector
import ner_normalizer

MAX_ATTEMPTS = 2
DELAY_BETWEEN_ATTEMPTS = 1
OUTPUT_FILE = pathlib.Path(__file__).with_name("output.csv")
LOG_FILE = pathlib.Path(__file__).with_name("processing.log")

CSV_FIELDS = [
    "category",
    "news_title",
    "provider_name",
    "city",
    "state",
    "country",
    "power_MW",
    "investment_usd_m",
    "publish_date",
    "link",
]


def setup_logging() -> None:
    LOG_FILE.parent.mkdir(exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as file:
        file.write(f"\n\nSession started: {datetime.now().isoformat()}\n")


def log_message(message: str, color: str | None = None) -> None:
    colors = {
        "green": "\033[92m",
        "red": "\033[91m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "end": "\033[0m",
    }

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {message}"

    with LOG_FILE.open("a", encoding="utf-8") as file:
        file.write(line + "\n")

    if color in colors:
        print(f"{colors[color]}{line}{colors['end']}")
    else:
        print(line)


def normalize_date(value: str) -> str:
    if not value:
        return ""

    date_string = str(value).strip()
    rss_formats = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%d %b %Y %H:%M:%S %z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]

    for date_format in rss_formats:
        try:
            parsed = datetime.strptime(date_string, date_format)
            return parsed.strftime("%d %b %Y")
        except Exception:
            continue

    match = re.search(r"\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b", date_string)
    if match:
        return match.group(0)

    return date_string


def process_article(link: Dict) -> List[Dict]:
    """Fetch one article and extract structured information."""
    fetched_title = ""
    body = ""

    for attempt in range(MAX_ATTEMPTS):
        try:
            fetched_title, body = article_fetcher.fetch(link["url"])
            break
        except Exception as exc:
            if attempt == MAX_ATTEMPTS - 1:
                log_message(
                    f"Failed to FETCH {link['url']} after {MAX_ATTEMPTS} attempts: {exc}",
                    "red",
                )
                return [
                    {
                        "category": "error",
                        "news_title": None,
                        "provider_name": None,
                        "city": None,
                        "state": None,
                        "country": None,
                        "power_MW": None,
                        "investment_usd_m": None,
                        "publish_date": normalize_date(link.get("published", "")),
                        "link": link["url"],
                    }
                ]
            time.sleep(DELAY_BETWEEN_ATTEMPTS)

    title = fetched_title or link.get("title", "")
    body_words = len((body or "").split())
    log_message(
        f"[EXTRACT] Using title: {title[:120]} | body_words={body_words}",
        "blue",
    )

    try:
        rows = ner_normalizer.extract(
            title=title,
            body=body,
            publish_date=normalize_date(link.get("published", "")),
            url=link["url"],
        )

        for row in rows:
            log_message(
                f"[NER] title={row.get('news_title')} | "
                f"provider={row.get('provider_name')} | "
                f"city={row.get('city')} | state={row.get('state')} | "
                f"country={row.get('country')} | power={row.get('power_MW')} | "
                f"invest={row.get('investment_usd_m')} | "
                f"category={row.get('category')}",
                "green" if row.get("category") != "error" else "yellow",
            )

        collector.mark_processed([link["url"]])
        return rows
    except Exception as exc:
        log_message(f"[NER ERROR] {link['url']}: {exc}", "red")
        return [
            {
                "category": "error",
                "news_title": title,
                "provider_name": None,
                "city": None,
                "state": None,
                "country": None,
                "power_MW": None,
                "investment_usd_m": None,
                "publish_date": normalize_date(link.get("published", "")),
                "link": link["url"],
            }
        ]


def write_results(rows: List[Dict]) -> None:
    file_exists = OUTPUT_FILE.exists()

    with OUTPUT_FILE.open("a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_FIELDS)
        if not file_exists:
            writer.writeheader()

        for row in rows:
            row["publish_date"] = normalize_date(row.get("publish_date", ""))
            writer.writerow({field: row.get(field) for field in CSV_FIELDS})


def analyze_results(rows: List[Dict]) -> None:
    counts = {
        category: 0
        for category in ["construction", "expansion", "investment", "other", "error"]
    }
    counts["total"] = len(rows)
    counts["with_investment"] = sum(
        1 for row in rows if row.get("investment_usd_m")
    )

    for row in rows:
        category = row.get("category", "error")
        counts[category] = counts.get(category, 0) + 1

    log_message(
        "\nRun Summary:\n"
        f"- Total processed: {counts['total']}\n"
        f"- Construction: {counts['construction']}\n"
        f"- Expansion: {counts['expansion']}\n"
        f"- Investment: {counts['investment']}\n"
        f"- Other: {counts['other']}\n"
        f"- Errors: {counts['error']}\n"
        f"- With investment data: {counts['with_investment']}\n",
        "yellow",
    )


def main() -> None:
    setup_logging()
    start_time = time.time()

    try:
        log_message("Starting collection phase...", "blue")
        links = collector.collect()

        if not links:
            log_message("No new articles found today.", "yellow")
            return

        log_message(f"Collected {len(links)} new articles to process", "blue")
        all_rows: List[Dict] = []

        max_workers = min(4, len(links))
        log_message(
            f"Processing articles in parallel using {max_workers} worker threads...",
            "blue",
        )

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_index = {
                executor.submit(process_article, link): (idx, link)
                for idx, link in enumerate(links, start=1)
            }
            for future in concurrent.futures.as_completed(future_to_index):
                idx, link = future_to_index[future]
                try:
                    rows = future.result()
                    all_rows.extend(rows)
                    log_message(
                        f"Completed processing article {idx}/{len(links)}: {link['url']}",
                        "green",
                    )
                except Exception as exc:
                    log_message(
                        f"Error processing article {idx}/{len(links)}: {exc}",
                        "red",
                    )

        log_message("Writing results to CSV...", "blue")
        write_results(all_rows)
        analyze_results(all_rows)

        elapsed = time.time() - start_time
        log_message(f"Completed successfully in {elapsed:.1f} seconds", "green")
    except Exception as exc:
        log_message(f"Critical failure: {exc}", "red")
        raise


if __name__ == "__main__":
    main()