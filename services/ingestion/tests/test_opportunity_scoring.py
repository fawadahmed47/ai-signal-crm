from __future__ import annotations

import pathlib
import sys
import unittest
from datetime import datetime, timezone

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from opportunity_scoring import OPPORTUNITY_SCORE_VERSION, calculate_opportunity_score


def score(**overrides):
    values = {
        "category": "other",
        "investment_usd_millions": None,
        "power_capacity_mw": None,
        "evidence_url": "",
        "company_name": None,
        "published_at": None,
        "location_text": None,
        "title": "Untitled signal",
    }
    values.update(overrides)
    return calculate_opportunity_score(**values)


class OpportunityScoringTests(unittest.TestCase):
    def test_scores_a_complete_high_value_construction_signal(self) -> None:
        result = score(
            category="construction",
            investment_usd_millions=1200,
            power_capacity_mw=600,
            evidence_url="https://example.com/evidence",
            company_name="Acme Data",
            published_at=datetime(2026, 8, 17, tzinfo=timezone.utc),
            location_text="Zurich, Switzerland",
            title="Acme announces a new campus",
        )

        self.assertEqual(result.version, OPPORTUNITY_SCORE_VERSION)
        self.assertEqual(result.total, 100)
        self.assertEqual(
            result.components,
            {
                "category": 35,
                "investment": 25,
                "power_capacity": 20,
                "evidence_completeness": 20,
            },
        )

    def test_applies_documented_numeric_thresholds(self) -> None:
        self.assertEqual(score(investment_usd_millions=24.9).components["investment"], 6)
        self.assertEqual(score(investment_usd_millions=25).components["investment"], 12)
        self.assertEqual(score(investment_usd_millions=100).components["investment"], 18)
        self.assertEqual(score(investment_usd_millions=500).components["investment"], 22)
        self.assertEqual(score(investment_usd_millions=1000).components["investment"], 25)
        self.assertEqual(score(power_capacity_mw=24.9).components["power_capacity"], 6)
        self.assertEqual(score(power_capacity_mw=25).components["power_capacity"], 12)
        self.assertEqual(score(power_capacity_mw=100).components["power_capacity"], 16)
        self.assertEqual(score(power_capacity_mw=500).components["power_capacity"], 20)

    def test_is_reproducible_and_bounded_for_incomplete_data(self) -> None:
        first = score(category="unexpected", investment_usd_millions=-1)
        second = score(category="unexpected", investment_usd_millions=-1)

        self.assertEqual(first, second)
        self.assertEqual(first.total, 12)
        self.assertGreaterEqual(first.total, 0)
        self.assertLessEqual(first.total, 100)


if __name__ == "__main__":
    unittest.main()
