from __future__ import annotations

import json
import pathlib
import sys
import unittest

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from contracts import SIGNAL_CONTRACT_VERSION, SignalContract


class SignalContractTests(unittest.TestCase):
    def test_maps_extracted_row_to_versioned_contract(self) -> None:
        contract = SignalContract.from_extracted_row(
            {
                "category": "Investment",
                "news_title": "Acme announces a new campus",
                "provider_name": "Acme Data, Inc.",
                "city": "Zurich",
                "country": "Switzerland",
                "power_MW": "120",
                "investment_usd_m": 450,
                "publish_date": "15 Aug 2026",
                "link": "https://example.com/acme-campus",
            }
        )

        self.assertEqual(contract.version, SIGNAL_CONTRACT_VERSION)
        self.assertEqual(contract.external_id, "https://example.com/acme-campus")
        self.assertEqual(contract.normalized_company_name, "acme data")
        self.assertEqual(contract.location_text, "Zurich, Switzerland")
        self.assertEqual(contract.power_capacity_mw, 120.0)
        self.assertEqual(contract.investment_usd_millions, 450.0)
        self.assertEqual(contract.published_at.isoformat(), "2026-08-15T00:00:00+00:00")
        self.assertEqual(contract.opportunity_score, 84)
        self.assertEqual(
            contract.score_components,
            {
                "category": 30,
                "investment": 18,
                "power_capacity": 16,
                "evidence_completeness": 20,
            },
        )
        self.assertIn("Evidence:", contract.score_explanation)
        self.assertIn("Score: 84/100", contract.score_explanation)
        self.assertEqual(contract.explanation_version, "1.0")
        self.assertIn("Reported investment: USD 450 million", contract.explanation_facts)
        self.assertEqual(contract.raw_payload["contract_version"], "1.3")

    def test_creates_stable_fallback_external_id(self) -> None:
        row = {"news_title": "No URL signal", "publish_date": "15 Aug 2026"}
        first = SignalContract.from_extracted_row(row)
        second = SignalContract.from_extracted_row(row)
        self.assertEqual(first.external_id, second.external_id)
        self.assertEqual(len(first.external_id), 64)

    def test_json_payload_is_serializable(self) -> None:
        contract = SignalContract.from_extracted_row(
            {"news_title": "Serializable", "link": "https://example.com/1"}
        )
        payload = json.loads(contract.json_payload())
        self.assertEqual(payload["version"], "1.3")
        self.assertEqual(payload["evidence_url"], "https://example.com/1")
        self.assertEqual(payload["score_version"], "1.0")
        self.assertEqual(payload["opportunity_score"], 22)
        self.assertEqual(payload["explanation_version"], "1.0")


if __name__ == "__main__":
    unittest.main()
