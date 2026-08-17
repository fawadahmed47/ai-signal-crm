from __future__ import annotations

import pathlib
import sys
import unittest

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from company_normalization import canonical_company_name, normalize_company_name


class CompanyNormalizationTests(unittest.TestCase):
    def test_legal_name_variants_share_an_identity_key(self) -> None:
        variants = (
            "Acme Data, Inc.",
            "ACME DATA INCORPORATED",
            "The Acme Data Corporation",
            "  Acme   Data LLC  ",
        )

        self.assertEqual(
            {normalize_company_name(value) for value in variants},
            {"acme data"},
        )

    def test_normalizes_ampersands_and_unicode_without_fuzzy_matching(self) -> None:
        self.assertEqual(normalize_company_name("AT&T Ltd."), "at and t")
        self.assertEqual(normalize_company_name("Müller AG"), "müller")
        self.assertNotEqual(
            normalize_company_name("Northwind Data"),
            normalize_company_name("Northwind Logistics"),
        )

    def test_preserves_legal_only_name_as_a_nonempty_key(self) -> None:
        self.assertEqual(normalize_company_name("Company Inc."), "company inc")

    def test_canonical_name_collapses_extraction_whitespace(self) -> None:
        self.assertEqual(canonical_company_name("  Acme\t Data  Inc. "), "Acme Data Inc.")


if __name__ == "__main__":
    unittest.main()
