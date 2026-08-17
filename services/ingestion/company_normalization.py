"""Deterministic company identity normalization."""

from __future__ import annotations

import re
import unicodedata

LEGAL_SUFFIXES = frozenset(
    {
        "ag",
        "bv",
        "co",
        "company",
        "corp",
        "corporation",
        "gmbh",
        "inc",
        "incorporated",
        "limited",
        "llc",
        "ltd",
        "nv",
        "plc",
        "sa",
        "sas",
    }
)


def canonical_company_name(value: str) -> str:
    """Trim extraction noise while retaining a human-readable company name."""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", value)).strip()


def normalize_company_name(value: str) -> str:
    """Return the stable key used to match common legal-name variants.

    The algorithm is intentionally conservative: it normalizes Unicode, case,
    punctuation, ampersands, a leading article, and trailing legal suffixes. It
    does not attempt fuzzy matching, which could silently combine unrelated
    companies.
    """
    canonical = canonical_company_name(value)
    text = canonical.casefold().replace("&", " and ")
    tokens = re.findall(r"[^\W_]+", text, flags=re.UNICODE)
    original_tokens = list(tokens)

    if tokens and tokens[0] == "the":
        tokens = tokens[1:]
    while tokens and tokens[-1] in LEGAL_SUFFIXES:
        tokens.pop()

    # Avoid turning names consisting only of legal terms into an empty key.
    if not tokens:
        tokens = original_tokens

    return " ".join(tokens)
