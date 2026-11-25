import unittest

from classifier import select_category


class SelectCategoryTests(unittest.TestCase):
    def test_selects_clear_high_similarity_category(self):
        self.assertEqual(
            select_category({"food": 0.72, "transport": 0.53, "other": 0.41}),
            {"value": "food", "confidence": 0.72},
        )

    def test_rejects_weak_or_ambiguous_matches(self):
        self.assertIsNone(select_category({"food": 0.32, "transport": 0.21}))
        self.assertIsNone(select_category({"food": 0.62, "transport": 0.61}))

    def test_rejects_weakly_separated_receipt_categories(self):
        self.assertIsNone(
            select_category(
                {
                    "food": 0.573,
                    "transport": 0.556,
                    "shopping": 0.537,
                    "utilities": 0.588,
                    "housing": 0.583,
                    "other": 0.616,
                }
            )
        )

    def test_keeps_a_clear_category_match(self):
        self.assertEqual(
            select_category({"food": 0.626, "transport": 0.532, "shopping": 0.534, "other": 0.525}),
            {"value": "food", "confidence": 0.626},
        )
