#!/usr/bin/env python3
"""
Unit tests for validate-data.py's individual check functions.

Usage:
    python3 scripts/test_validate_data.py
"""
import sys
import os
import json
import time
import tempfile
import unittest
import importlib.util
from datetime import date, timedelta
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


class TestCheckLogoFiles(unittest.TestCase):
    def test_existing_logo_ok(self):
        # make_model 的默认 url 是外链，logo 为空字符串时不检查
        m = make_model(logo="")
        self.assertEqual(V.check_logo_files([m]), [])

    def test_missing_logo_flagged(self):
        m = make_model(logo="/logos/definitely-not-exist-xyz.svg")
        issues = V.check_logo_files([m])
        self.assertTrue(any("logo 文件缺失" in i for i in issues))

    def test_external_logo_skipped(self):
        m = make_model(logo="https://example.com/logo.svg")
        self.assertEqual(V.check_logo_files([m]), [])


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

    def test_legit_extreme_low_score_not_flagged(self):
        """真实存在的极低分新模型（如 celeris-1 ≈11.8）不应触发异常值报警"""
        models = [make_model(id=f"m{i}", scores={"intelligence": 35.0 + i}) for i in range(30)]
        models.append(make_model(id="tiny-model", scores={"intelligence": 11.8}))
        issues = V.check_score_distribution(models)
        self.assertFalse(any("outlier" in i for i in issues))

    def test_corrupted_zero_score_flagged(self):
        """数据损坏（intelligence=0）仍应被检测为异常值"""
        models = [make_model(id=f"m{i}", scores={"intelligence": 35.0 + i}) for i in range(30)]
        models.append(make_model(id="broken", scores={"intelligence": 0}))
        issues = V.check_score_distribution(models)
        self.assertTrue(any("broken" in i for i in issues))


class TestCheckThresholds(unittest.TestCase):
    def setUp(self):
        # 关闭基于历史的动态阈值，避免测试结果依赖 data/5-history 快照内容
        self._orig_history_enabled = V.HISTORY_THRESHOLDS_ENABLED
        V.HISTORY_THRESHOLDS_ENABLED = False

    def tearDown(self):
        V.HISTORY_THRESHOLDS_ENABLED = self._orig_history_enabled

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


class TestCheckSourceHealth(unittest.TestCase):
    """check_source_health：覆盖率分级 + degraded 告警（读取 ranking-meta.json）。"""

    def _run_with_meta(self, meta):
        tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
        self.addCleanup(os.unlink, tmp.name)
        with tmp:
            json.dump(meta, tmp)
        orig = V.META_PATH
        V.META_PATH = Path(tmp.name)
        try:
            return V.check_source_health([])
        finally:
            V.META_PATH = orig

    def test_low_coverage_is_issue(self):
        """覆盖率 < 30% 报 issue"""
        issues, warnings = self._run_with_meta({"sources": {"aa": {"coverage": 0.2}}})
        self.assertTrue(any("覆盖率严重过低" in i for i in issues))

    def test_mid_coverage_is_warning(self):
        """覆盖率 30%-50% 报 warning（修复前该分支为死代码）"""
        issues, warnings = self._run_with_meta({"sources": {"aa": {"coverage": 0.4}}})
        self.assertEqual(issues, [])
        self.assertTrue(any("覆盖率偏低" in w for w in warnings))

    def test_high_coverage_quiet(self):
        issues, warnings = self._run_with_meta({"sources": {"aa": {"coverage": 0.9}}})
        self.assertEqual(issues, [])
        self.assertEqual(warnings, [])

    def test_degraded_is_warning(self):
        """sources.*.degraded=true 报 warning（配合管线降级可见性）"""
        issues, warnings = self._run_with_meta({"sources": {"aa": {"coverage": 0.9, "degraded": True}}})
        self.assertEqual(issues, [])
        self.assertTrue(any("degraded" in w for w in warnings))

    def test_partial_update_is_warning(self):
        issues, warnings = self._run_with_meta({"partial_update": True, "sources": {}})
        self.assertTrue(any("partial_update" in w for w in warnings))


class TestCheckSourceFreshness(unittest.TestCase):
    """check_source_freshness：Arena 用内容快照日期，AA/OR 用文件 mtime。"""

    def setUp(self):
        self._orig_dir = V.RAW_DIR
        self._orig_warn = V.FRESHNESS_WARN_DAYS
        self._orig_fail = V.FRESHNESS_FAIL_DAYS
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.raw_dir = Path(self._tmp.name)
        V.RAW_DIR = self.raw_dir
        V.FRESHNESS_WARN_DAYS = 3
        V.FRESHNESS_FAIL_DAYS = 10
        # AA/OR 放置新鲜文件，默认只单独测 Arena
        (self.raw_dir / "aa_all_full.json").write_text("[]")
        (self.raw_dir / "or_models_full.json").write_text("{}")

    def tearDown(self):
        V.RAW_DIR = self._orig_dir
        V.FRESHNESS_WARN_DAYS = self._orig_warn
        V.FRESHNESS_FAIL_DAYS = self._orig_fail

    def _write_arena(self, snapshot_date: str):
        (self.raw_dir / "arena_leaderboards.json").write_text(
            json.dumps({"date": snapshot_date, "leaderboards": {}})
        )

    def test_fresh_data_quiet(self):
        self._write_arena(date.today().isoformat())
        issues, warnings = V.check_source_freshness()
        self.assertEqual(issues, [])
        self.assertEqual(warnings, [])

    def test_stale_arena_snapshot_is_warning(self):
        """快照日期超 warn 阈值报 warning（mtime 无法发现的镜像滞后）"""
        self._write_arena((date.today() - timedelta(days=5)).isoformat())
        issues, warnings = V.check_source_freshness()
        self.assertEqual(issues, [])
        self.assertTrue(any("Arena" in w for w in warnings))

    def test_very_stale_arena_snapshot_is_issue(self):
        """快照日期超 fail 阈值报 issue（曾发生镜像落后 14 天无人发现）"""
        self._write_arena((date.today() - timedelta(days=14)).isoformat())
        issues, warnings = V.check_source_freshness()
        self.assertTrue(any("Arena" in i for i in issues))

    def test_stale_mtime_is_issue(self):
        """AA/OR 用文件 mtime 兜底"""
        self._write_arena(date.today().isoformat())
        old = time.time() - 20 * 86400
        p = self.raw_dir / "aa_all_full.json"
        os.utime(p, (old, old))
        issues, warnings = V.check_source_freshness()
        self.assertTrue(any("AA" in i for i in issues))

    def test_missing_raw_files_is_warning(self):
        """原始数据缺失只告警不阻断"""
        for f in self.raw_dir.iterdir():
            f.unlink()
        issues, warnings = V.check_source_freshness()
        self.assertEqual(issues, [])
        self.assertTrue(any("缺失" in w for w in warnings))


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
