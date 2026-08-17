#!/usr/bin/env python3
"""
article_fetcher.py - robust content extraction with fallbacks (v2)

fetch(url) -> (headline, body_text)

Strategy:
1. requests + readability, if available
2. cloudscraper fallback
3. always return a best-effort title and body
"""

from __future__ import annotations

import re
import time
from typing import Optional, Tuple

import requests  # type: ignore

try:
    import cloudscraper  # type: ignore
except Exception:
    cloudscraper = None

try:
    from bs4 import BeautifulSoup  # type: ignore
except Exception:
    BeautifulSoup = None

try:
    from readability import Document  # type: ignore
except Exception:
    Document = None

TIMEOUT = 8
UA = {"User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)"}
MAX_BODY_CHARS = 100_000


def _download_with_requests(url: str) -> Optional[str]:
    try:
        response = requests.get(url, headers=UA, timeout=TIMEOUT)
        if response.status_code == 200 and response.text:
            return response.text
    except Exception:
        return None
    return None


def _download_with_cloudscraper(url: str) -> Optional[str]:
    if cloudscraper is None:
        return None

    try:
        scraper = cloudscraper.create_scraper()
        response = scraper.get(url, headers=UA, timeout=TIMEOUT)
        if response.status_code == 200 and response.text:
            return response.text
    except Exception:
        return None
    return None


def _readability_extract(html: str) -> Tuple[str, str]:
    title = ""
    body = ""
    content_html = ""

    if Document is not None:
        try:
            document = Document(html)
            title = document.short_title() or ""
            content_html = document.summary() or ""
        except Exception:
            content_html = ""

    if BeautifulSoup is not None:
        try:
            if content_html:
                soup = BeautifulSoup(content_html, "html.parser")
                body = soup.get_text(" ", strip=True)
            else:
                soup = BeautifulSoup(html, "html.parser")
                if not title and soup.title and soup.title.string:
                    title = soup.title.string.strip()
                paragraphs = " ".join(
                    paragraph.get_text(" ", strip=True)
                    for paragraph in soup.find_all("p")
                )
                body = paragraphs.strip()
        except Exception:
            body = ""

    title = (title or "").strip() or "Untitled"
    body = re.sub(r"\s+", " ", (body or "")).strip()
    return title, body[:MAX_BODY_CHARS]


def _truncate(value: str, limit: int = MAX_BODY_CHARS) -> str:
    return value[:limit] if value else ""


def fetch(url: str) -> Tuple[str, str]:
    """Fetch and extract an article title and body."""
    # Attempt 1: requests + readability/BeautifulSoup.
    html = _download_with_requests(url)
    if html:
        title, body = _readability_extract(html)
        if title and body:
            return title, _truncate(body)
        if title and body:
            return title, _truncate(body)

    # Attempt 2: cloudscraper fallback.
    html = _download_with_cloudscraper(url)
    if html:
        title, body = _readability_extract(html)
        if title and body:
            return title, _truncate(body)
        if title:
            return title, _truncate(body)

    # Best-effort fallback.
    return "Untitled", ""


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        sys.exit("USAGE: python article_fetcher.py <URL>")

    article_url = sys.argv[1]
    start = time.time()
    article_title, article_body = fetch(article_url)
    elapsed = time.time() - start

    print(f"Fetched in {elapsed:.2f}s")
    print("Title:", article_title)
    print("Body words:", len((article_body or "").split()))
    print(article_body[:1000])
