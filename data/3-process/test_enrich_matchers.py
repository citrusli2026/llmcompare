"""
Tests for fuzzy matchers in enrich_models.py.

These matchers are the most fragile part of the pipeline — AA/OR/Arena
naming is inconsistent, and any rename can silently break coverage.

Each test documents one expected behavior. Run against the current
implementation; a failure means the matcher has a bug OR the test
mis-encodes intent.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from enrich_models import match_arena_entries, match_arena_votes, match_or_value


class TestMatchOrValue(unittest.TestCase):
    """match_or_value: align model_name against OR data map."""

    def test_direct_match(self):
        data = {"qwen 2.5 max": {"prompt": 1.0}}
        self.assertEqual(match_or_value("Qwen 2.5 Max", data), {"prompt": 1.0})

    def test_direct_match_is_case_insensitive(self):
        data = {"qwen": 42}
        self.assertEqual(match_or_value("QWEN", data), 42)

    def test_substring_match_longest_wins(self):
        # Avoid Pro/Max variant price polluting base price
        data = {"qwen": 1, "qwen plus": 2}
        self.assertEqual(match_or_value("Qwen Plus Special", data), 2)

    def test_substring_requires_or_name_in_model_name(self):
        # OR name must be subset of model name (not vice versa)
        data = {"qwen plus": 1}
        self.assertIsNone(match_or_value("Qwen", data))

    def test_normalized_match_handles_dashes_and_dots(self):
        data = {"gpt 4": 1}
        self.assertEqual(match_or_value("gpt-4", data), 1)
        self.assertEqual(match_or_value("gpt.4", data), 1)
        self.assertEqual(match_or_value("GPT 4", data), 1)

    def test_no_match_returns_none(self):
        data = {"qwen": 1}
        self.assertIsNone(match_or_value("Llama 3", data))

    def test_empty_data_map(self):
        self.assertIsNone(match_or_value("Anything", {}))

    def test_empty_model_name(self):
        data = {"qwen": 1}
        self.assertIsNone(match_or_value("", data))


class TestMatchArenaVotes(unittest.TestCase):
    """match_arena_votes: align model_name to Arena votes map."""

    def test_direct_match(self):
        votes = {"gpt-4o": 1000}
        self.assertEqual(match_arena_votes("gpt-4o", votes), 1000)

    def test_normalized_match_handles_dashes(self):
        votes = {"gpt 4o": 1000}
        self.assertEqual(match_arena_votes("gpt-4o", votes), 1000)

    def test_substring_match_both_directions(self):
        # Both: model_name ⊆ arena_name AND arena_name ⊆ model_name
        votes = {"qwen 2.5 max": 500}
        self.assertEqual(match_arena_votes("qwen 2.5", votes), 500)
        self.assertEqual(match_arena_votes("qwen 2.5 max special", votes), 500)

    def test_variant_map_resolves_to_parent(self):
        votes = {"deepseek v4 pro": 800}
        variant_map = {"deepseek v4 pro max": "deepseek v4 pro"}
        self.assertEqual(
            match_arena_votes("DeepSeek V4 Pro Max", votes, variant_map),
            800,
        )

    def test_no_match_returns_none(self):
        self.assertIsNone(match_arena_votes("Nothing Matches", {"gpt-4o": 1}))


class TestMatchArenaEntries(unittest.TestCase):
    """match_arena_entries: find best Arena entry for a model."""

    SAMPLE = [
        {"model": "GPT-4o", "rank": 1, "score": 1300, "votes": 1000},
        {"model": "Qwen 2.5 Max", "rank": 5, "score": 1250, "votes": 800},
        {"model": "DeepSeek V4 Pro", "rank": 3, "score": 1280, "votes": 900},
        {"model": "Qwen 2.5 Plus", "rank": 8, "score": 1200, "votes": 600},
    ]

    def test_explicit_mapping_takes_priority(self):
        mapping = {"My Model": ["GPT-4o"]}
        result = match_arena_entries("My Model", self.SAMPLE, mapping)
        self.assertEqual(result["rank"], 1)

    def test_direct_match_returns_entry(self):
        result = match_arena_entries("GPT-4o", self.SAMPLE)
        self.assertEqual(result["model"], "GPT-4o")
        self.assertEqual(result["rank"], 1)

    def test_multiple_matches_returns_lowest_rank(self):
        # Contrived: two entries with same model name, different ranks.
        # Documents that lowest rank wins when multiple entries match.
        sample = [
            {"model": "Qwen 2.5 Max", "rank": 5, "score": 1250, "votes": 800},
            {"model": "Qwen 2.5 Max", "rank": 2, "score": 1290, "votes": 900},
        ]
        result = match_arena_entries("Qwen 2.5 Max", sample)
        self.assertEqual(result["rank"], 2)

    def test_normalized_match_handles_dashes(self):
        result = match_arena_entries("DeepSeek-V4-Pro", self.SAMPLE)
        self.assertEqual(result["rank"], 3)

    def test_keyword_match_uses_last_words(self):
        # "Our DeepSeek V4 Pro 2024" — last 2 words of arena "DeepSeek V4 Pro" = "v4 pro"
        result = match_arena_entries("Our DeepSeek V4 Pro 2024", self.SAMPLE)
        self.assertEqual(result["model"], "DeepSeek V4 Pro")

    def test_variant_aggregation_inherits_parent_ranking(self):
        # variant_map says this model is a variant of "DeepSeek V4 Pro"
        variant_map = {"DeepSeek V4 Pro Max": "DeepSeek V4 Pro"}
        result = match_arena_entries(
            "DeepSeek V4 Pro Max", self.SAMPLE, None, variant_map
        )
        self.assertEqual(result["rank"], 3)

    def test_no_match_returns_none(self):
        self.assertIsNone(match_arena_entries("Nothing Like This", self.SAMPLE))

    def test_empty_inputs_return_none(self):
        self.assertIsNone(match_arena_entries("Qwen", []))
        self.assertIsNone(match_arena_entries("", self.SAMPLE))


if __name__ == "__main__":
    unittest.main()
