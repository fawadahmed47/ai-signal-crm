"""Evidence-grounded explanations for advisory opportunity scores."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Mapping, Optional, Tuple

EVIDENCE_EXPLANATION_VERSION = "1.0"

CATEGORY_INTERPRETATIONS = {
    "construction": (
        "Construction activity can create near-term demand for infrastructure, "
        "suppliers, and operating services."
    ),
    "expansion": (
        "Expansion activity can introduce new sites, teams, vendors, and commercial "
        "planning needs."
    ),
    "investment": (
        "Reported investment can indicate available budget and an active window for "
        "commercial engagement."
    ),
    "other": "The signal warrants review, but no stronger category inference is available.",
}


@dataclass(frozen=True)
class EvidenceExplanation:
    version: str
    text: str
    facts: Tuple[str, ...]


def _format_number(value: float) -> str:
    if float(value).is_integer():
        return f"{int(value):,}"
    return f"{value:,.2f}".rstrip("0").rstrip(".")


def generate_evidence_explanation(
    *,
    title: str,
    category: str,
    company_name: Optional[str],
    investment_usd_millions: Optional[float],
    power_capacity_mw: Optional[float],
    location_text: Optional[str],
    published_at: Optional[datetime],
    evidence_url: str,
    opportunity_score: int,
    score_components: Mapping[str, int],
) -> EvidenceExplanation:
    """Explain a score while keeping extracted facts separate from inference."""
    facts = [f"Headline: {title}"]
    if company_name:
        facts.append(f"Company: {company_name}")
    facts.append(f"Signal category: {category}")
    if investment_usd_millions is not None and investment_usd_millions > 0:
        facts.append(
            "Reported investment: USD "
            f"{_format_number(investment_usd_millions)} million"
        )
    if power_capacity_mw is not None and power_capacity_mw > 0:
        facts.append(f"Reported power capacity: {_format_number(power_capacity_mw)} MW")
    if location_text:
        facts.append(f"Location: {location_text}")
    if published_at:
        facts.append(f"Published: {published_at.date().isoformat()}")
    if evidence_url:
        facts.append(f"Source: {evidence_url}")

    score_text = (
        f"Score: {opportunity_score}/100 "
        f"(category {score_components.get('category', 0)}/35, "
        f"investment {score_components.get('investment', 0)}/25, "
        f"power capacity {score_components.get('power_capacity', 0)}/20, "
        "evidence completeness "
        f"{score_components.get('evidence_completeness', 0)}/20)."
    )
    interpretation = CATEGORY_INTERPRETATIONS.get(
        category, CATEGORY_INTERPRETATIONS["other"]
    )
    text = (
        f"Evidence: {'; '.join(facts)}. {score_text} "
        f"Commercial interpretation: {interpretation} "
        "Review the retained source before taking CRM action."
    )
    return EvidenceExplanation(
        version=EVIDENCE_EXPLANATION_VERSION,
        text=text,
        facts=tuple(facts),
    )
