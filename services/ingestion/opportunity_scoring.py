"""Versioned, deterministic opportunity scoring for extracted signals."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Mapping, Optional

OPPORTUNITY_SCORE_VERSION = "1.0"

CATEGORY_POINTS = {
    "construction": 35,
    "expansion": 32,
    "investment": 30,
    "other": 12,
}


@dataclass(frozen=True)
class OpportunityScore:
    version: str
    total: int
    components: Mapping[str, int]


def _investment_points(value: Optional[float]) -> int:
    if value is None or value <= 0:
        return 0
    if value >= 1000:
        return 25
    if value >= 500:
        return 22
    if value >= 100:
        return 18
    if value >= 25:
        return 12
    return 6


def _power_points(value: Optional[float]) -> int:
    if value is None or value <= 0:
        return 0
    if value >= 500:
        return 20
    if value >= 100:
        return 16
    if value >= 25:
        return 12
    return 6


def calculate_opportunity_score(
    *,
    category: str,
    investment_usd_millions: Optional[float],
    power_capacity_mw: Optional[float],
    evidence_url: str,
    company_name: Optional[str],
    published_at: Optional[datetime],
    location_text: Optional[str],
    title: str,
) -> OpportunityScore:
    """Calculate a 0–100 advisory score from persisted signal facts.

    Recency is intentionally excluded because the inbox already orders by
    import time. Excluding wall-clock time also makes reprocessing reproducible.
    """
    evidence_points = 0
    evidence_points += 8 if evidence_url else 0
    evidence_points += 5 if company_name else 0
    evidence_points += 3 if published_at else 0
    evidence_points += 2 if location_text else 0
    evidence_points += 2 if title and title != "Untitled signal" else 0

    components = {
        "category": CATEGORY_POINTS.get(category, CATEGORY_POINTS["other"]),
        "investment": _investment_points(investment_usd_millions),
        "power_capacity": _power_points(power_capacity_mw),
        "evidence_completeness": evidence_points,
    }
    total = max(0, min(100, sum(components.values())))
    return OpportunityScore(
        version=OPPORTUNITY_SCORE_VERSION,
        total=total,
        components=components,
    )
