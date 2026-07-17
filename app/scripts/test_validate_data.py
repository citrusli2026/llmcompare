#!/usr/bin/env python3
"""
Unit tests for validate-data.py's individual check functions.

Usage:
    python3 scripts/test_validate_data.py
"""
import sys
import unittest
import importlib.util
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve().parent.parent / "scripts" / "validate-data.py"
spec = importlib.util.spec_from_file_location("validate_data", SCRIPT_PATH)
V = importlib.util.module_from_spec(spec)
spec.loader.exec_module(V)


def make_model(**overrides) -> dict:
    """Create a minimal valid model dict. Pass keyword overrides for any field."""
    model = {
        "id": "test-model",
        "name": "Test Model",
        "company": "TestCo",
        "type": "开源",
        "logo": "",
        "url": "https://example.com",
        "vendor_links": {"homepage": "https://example.com"},
        "flags": {
            "frontier": False,
            "open_weights": True,
            "reasoning": False,
            "image_input": False,
            "chinese_eval": True,
            "has_speed": False,
            "has_pricing": False,
            "data_complete": False,
        },
        "scores": {
            "intelligence": 70.0,
            "coding": 60.0,
            "agentic": 65.0,
        },
        "speed": {"median_tps": None, "ttft_seconds": None, "e2e_seconds": None},
        "pricing": {"input": 1.0, "output": 2.0},
        "meta": {
            "context_window": 128000,
            "parameters": 70,
            "output_tokens": None,
            "release_date": "2025-01-01",
        },
        "openrouter_pricing": None,
        "arena_rankings": None,
        "arena_votes": None,
        "cn_pricing": None,
        "data_completeness_pct": 60.0,
    }
    for key, val in overrides.items():
        if key in model and isinstance(model[key], dict) and isinstance(val, dict):
            model[key].update(val)
        else:
            model[key] = val
    return model


class TestCheckRequiredFields(unittest.TestCase):
    def test_valid_model_no_issues(self):
        m = make_model()
        issues = V.check_required_fields([m])
        self.assertEqual(issues, [])

    def test_missing_top_level_field(self):
        m = make_model()
        del m["name"]
        issues = V.check_required_fields([m])
        self.assertTrue(any("missing top-level field 'name'" in i for i in issues))

    def test_null_intel_allowed_for_non_complete(self):
        """data_complete=false 的模型 intelligence=null 可接受"""
        m = make_model(flags={"data_complete": False})
        m["scores"]["intelligence"] = None
        issues = V.check_required_fields([m])
        # Should have no issues about missing intel
        intel_issues = [i for i in issues if "scores.intelligence" in i]
        self.assertEqual(intel_issues, [])

    def test_null_intel_hard_error_for_complete(self):
        """data_complete=true 的模型 intelligence=null 是硬错误"""
        m = make_model(flags={"data_complete": True, "frontier": False, "open_weights": True})
        m["scores"]["intelligence"] = None
        issues = V.check_required_fields([m])
        self.assertTrue(any("data_complete=true but missing scores.intelligence" in i for i in issues))

    def test_missing_required_flag(self):
        m = make_model()
        del m["flags"]["frontier"]
        issues = V.check_required_fields([m])
        self.assertTrue(any("missing flag 'frontier'" in i for i in issues))


class TestCheckIntelligenceRange(unittest.TestCase):
    def test_valid_range(self):
        m = make_model(scores={"intelligence": 50})
        self.assertEqual(V.check_intelligence_range([m]), [])

    def test_out_of_range_negative(self):
        m = make_model(scores={"intelligence": -5})
        issues = V.check_intelligence_range([m])
        self.assertTrue(any("out of [0, 100]" in i for i in issues))

    def test_out_of_range_above_100(self):
        m = make_model(scores={"intelligence": 150})
        issues = V.check_intelligence_range([m])
        self.assertTrue(any("out of [0, 100]" in i for i in issues))

    def test_null_skipped(self):
        m = make_model(scores={"intelligence": None})
        self.assertEqual(V.check_intelligence_range([m]), [])


class TestCheckTypeValid(unittest.TestCase):
    def test_valid_types(self):
        m1 = make_model(type="开源")
        m2 = make_model(type="闭源")
        self.assertEqual(V.check_type_valid([m1, m2]), [])

    def test_invalid_type(self):
        m = make_model(type="Other")
        issues = V.check_type_valid([m])
        self.assertTrue(any("invalid type" in i for i in issues))


class TestCheckDuplicateIds(unittest.TestCase):
    def test_no_dupes(self):
        models = [make_model(id="a"), make_model(id="b")]
        self.assertEqual(V.check_duplicate_ids(models), [])

    def test_dupes_detected(self):
        models = [make_model(id="a"), make_model(id="a")]
        self.assertTrue(len(V.check_duplicate_ids(models)) > 0)


class TestCheckScoreDistribution(unittest.TestCase):
    def test_all_valid(self):
        models = [
            make_model(id="a", scores={"intelligence": 50}),
            make_model(id="b", scores={"intelligence": 60}),
        ]
        self.assertEqual(V.check_score_distribution(models), [])

    def test_null_intel_filtered(self):
        """intelligence=null 的模型不应导致崩溃"""
        models = [
            make_model(id="a", scores={"intelligence": 50}),
            make_model(id="b", scores={"intelligence": 60}),
            make_model(id="c", scores={"intelligence": None}),
        ]
        issues = V.check_score_distribution(models)
        self.assertIsInstance(issues, list)

    def test_less_than_two_models(self):
        self.assertEqual(V.check_score_distribution([make_model()]), [])

    def test_all_null_intel(self):
        """全部 intelligence=null 时不崩溃"""
        models = [
            make_model(id="a", scores={"intelligence": None}),
            make_model(id="b", scores={"intelligence": None}),
        ]
        issues = V.check_score_distribution(models)
        self.assertEqual(issues, [])


class TestCheckThresholds(unittest.TestCase):
    def test_within_threshold(self):
        """阈值在范围内时无问题"""
        models = [
            make_model(
                id=f"m{i}",
                flags={"frontier": i < 20, "chinese_eval": i < 32, "data_complete": i < 35,
                        "open_weights": True, "reasoning": False, "image_input": False,
                        "has_speed": i < 30, "has_pricing": i < 25},
                speed={"median_tps": 50 if i < 30 else None, "ttft_seconds": None, "e2e_seconds": None},
                arena_rankings={"text": {"elo": 1000}} if i < 25 else None,
                cn_pricing={"input": 10, "output": 20} if i < 25 else None,
            )
            for i in range(50)
        ]
        issues, stats, _ = V.check_thresholds(models)
        self.assertEqual(issues, [])

    def test_outside_threshold(self):
        """超出阈值时报错"""
        models = [make_model(id=f"m{i}") for i in range(200)]
        issues, stats, _ = V.check_thresholds(models)
        self.assertTrue(any("total_models" in i for i in issues))


class TestCheckDateValid(unittest.TestCase):
    def test_valid_date(self):
        m = make_model(meta={"release_date": "2024-01-01"})
        self.assertEqual(V.check_date_valid([m]), [])

    def test_future_date(self):
        m = make_model(meta={"release_date": "2099-01-01"})
        issues = V.check_date_valid([m])
        self.assertTrue(any("future release_date" in i for i in issues))

    def test_invalid_date_format(self):
        m = make_model(meta={"release_date": "not-a-date"})
        issues = V.check_date_valid([m])
        self.assertTrue(any("invalid release_date format" in i for i in issues))


class TestCheckRankingConsistency(unittest.TestCase):
    def test_frontier_high_intel(self):
        m = make_model(flags={"frontier": True}, scores={"intelligence": 90})
        issues, warnings = V.check_ranking_consistency([m])
        self.assertEqual(issues, [])

    def test_international_cn_pricing_warning(self):
        m = make_model(flags={"chinese_eval": False}, cn_pricing={"input": 10})
        issues, warnings = V.check_ranking_consistency([m])
        self.assertTrue(any("cn_pricing" in w for w in warnings))


class TestCheckUrlConsistency(unittest.TestCase):
    def test_missing_url_on_complete(self):
        m = make_model(flags={"data_complete": True}, url=None)
        warnings = V.check_url_consistency([m])
        self.assertTrue(len(warnings) > 0)

    def test_missing_url_on_incomplete_ok(self):
        m = make_model(flags={"data_complete": False}, url=None)
        warnings = V.check_url_consistency([m])
        self.assertEqual(warnings, [])


class TestComputeCompleteness(unittest.TestCase):
    def test_full_model(self):
        m = make_model()
        pct, actual, total, filled, missing = V.compute_completeness(m)
        self.assertGreater(pct, 50.0)

    def test_stripped_model(self):
        m = make_model(scores={}, pricing={}, url=None)
        m["flags"] = {}
        m["meta"] = {}
        m["speed"] = {}
        m["vendor_links"] = {}
        pct, actual, total, filled, missing = V.compute_completeness(m)
        self.assertLess(pct, 60.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
