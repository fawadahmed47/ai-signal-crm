"""Versioned contracts emitted by the ingestion pipeline."""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Mapping, Optional

from company_normalization import canonical_company_name, normalize_company_name
from opportunity_scoring import calculate_opportunity_score

SIGNAL_CONTRACT_VERSION = "1.2"


def _optional_decimal(value: Any) -> Optional[float]:
    if value in (None, ""):
        return None
    return float(value)


def _published_at(value: Any) -> Optional[datetime]:
    if not value:
        return None

    text = str(value).strip()
    for date_format in ("%d %b %Y", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            parsed = datetime.strptime(text, date_format)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            continue
    return None


@dataclass(frozen=True)
class SignalContract:
    """Stable boundary between extraction and storage adapters."""

    version: str
    external_id: str
    title: str
    category: str
    summary: str
    evidence_url: str
    company_name: Optional[str]
    normalized_company_name: Optional[str]
    location_text: Optional[str]
    power_capacity_mw: Optional[float]
    investment_usd_millions: Optional[float]
    published_at: Optional[datetime]
    opportunity_score: int
    score_version: str
    score_components: Mapping[str, int]
    raw_payload: Mapping[str, Any]

    @classmethod
    def from_extracted_row(cls, row: Mapping[str, Any]) -> "SignalContract":
        evidence_url = str(row.get("link") or "").strip()
        title = str(row.get("news_title") or "Untitled signal").strip()
        extracted_company_name = str(row.get("provider_name") or "")
        company_name = canonical_company_name(extracted_company_name) or None
        location_parts = [
            str(row.get(field)).strip()
            for field in ("city", "state", "country")
            if row.get(field)
        ]
        external_id = evidence_url or hashlib.sha256(
            f"{title}|{row.get('publish_date', '')}".encode("utf-8")
        ).hexdigest()
        category = str(row.get("category") or "other").strip().lower()
        location_text = ", ".join(location_parts) or None
        power_capacity_mw = _optional_decimal(row.get("power_MW"))
        investment_usd_millions = _optional_decimal(row.get("investment_usd_m"))
        published_at = _published_at(row.get("publish_date"))
        opportunity_score = calculate_opportunity_score(
            category=category,
            investment_usd_millions=investment_usd_millions,
            power_capacity_mw=power_capacity_mw,
            evidence_url=evidence_url,
            company_name=company_name,
            published_at=published_at,
            location_text=location_text,
            title=title,
        )

        payload = dict(row)
        payload["contract_version"] = SIGNAL_CONTRACT_VERSION

        return cls(
            version=SIGNAL_CONTRACT_VERSION,
            external_id=external_id,
            title=title,
            category=category,
            summary=title,
            evidence_url=evidence_url,
            company_name=company_name,
            normalized_company_name=(
                normalize_company_name(company_name) if company_name else None
            ),
            location_text=location_text,
            power_capacity_mw=power_capacity_mw,
            investment_usd_millions=investment_usd_millions,
            published_at=published_at,
            opportunity_score=opportunity_score.total,
            score_version=opportunity_score.version,
            score_components=opportunity_score.components,
            raw_payload=payload,
        )

    def json_payload(self) -> str:
        payload = asdict(self)
        payload["published_at"] = (
            self.published_at.isoformat() if self.published_at else None
        )
        return json.dumps(payload, default=str, sort_keys=True)
