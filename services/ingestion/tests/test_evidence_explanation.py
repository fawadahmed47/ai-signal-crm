from __future__ import annotations

import pathlib
import sys
import unittest
from datetime import datetime, timezone

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from evidence_explanation import (
    EVIDENCE_EXPLANATION_VERSION,
    generate_evidence_explanation,
)


class EvidenceExplanationTests(unittest.TestCase):
    def test_separates_source_facts_score_and_commercial_interpretation(self) -> None:
        explanation = generate_evidence_explanation(
            title="Acme announces a new campus",
            category="investment",
            company_name="Acme Data",
            investment_usd_millions=450,
            power_capacity_mw=120,
            location_text="Zurich, Switzerland",
            published_at=datetime(2026, 8, 15, tzinfo=timezone.utc),
            evidence_url="https://example.com/acme-campus",
            opportunity_score=84,
            score_components={
                "category": 30,
                "investment": 18,
                "power_capacity": 16,
                "evidence_completeness": 20,
            },
        )

        self.assertEqual(explanation.version, EVIDENCE_EXPLANATION_VERSION)
        self.assertIn("Evidence:", explanation.text)
        self.assertIn("Reported investment: USD 450 million", explanation.text)
        self.assertIn("Reported power capacity: 120 MW", explanation.text)
        self.assertIn("Score: 84/100", explanation.text)
        self.assertIn("Commercial interpretation:", explanation.text)
        self.assertIn("Review the retained source", explanation.text)
        self.assertIn("Source: https://example.com/acme-campus", explanation.facts)

    def test_does_not_invent_missing_quantified_facts(self) -> None:
        explanation = generate_evidence_explanation(
            title="Unquantified market update",
            category="other",
            company_name=None,
            investment_usd_millions=None,
            power_capacity_mw=None,
            location_text=None,
            published_at=None,
            evidence_url="",
            opportunity_score=14,
            score_components={"category": 12, "evidence_completeness": 2},
        )

        self.assertNotIn("Reported investment", explanation.text)
        self.assertNotIn("Reported power capacity", explanation.text)
        self.assertNotIn("Source:", explanation.text)
        self.assertIn("no stronger category inference is available", explanation.text)

    def test_generation_is_deterministic(self) -> None:
        values = {
            "title": "Repeatable explanation",
            "category": "expansion",
            "company_name": "Acme",
            "investment_usd_millions": 25,
            "power_capacity_mw": None,
            "location_text": "Bern, Switzerland",
            "published_at": None,
            "evidence_url": "https://example.com/repeatable",
            "opportunity_score": 61,
            "score_components": {
                "category": 32,
                "investment": 12,
                "power_capacity": 0,
                "evidence_completeness": 17,
            },
        }
        self.assertEqual(
            generate_evidence_explanation(**values),
            generate_evidence_explanation(**values),
        )


if __name__ == "__main__":
    unittest.main()
