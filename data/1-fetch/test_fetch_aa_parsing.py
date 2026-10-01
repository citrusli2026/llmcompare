#!/usr/bin/env python3
"""fetch_aa_data.py 字段别名与指数估算的回归测试。

背景：AA 会不定期改上游 RSC 键名/下线指数（2026-08 删 codingIndex，
2026-09 删 agenticIndex 且 terminalbenchV21 → terminalBench21），曾导致
coding/agentic 全量变 None、每日刷新 CI 连续失败 28 天。
本测试锁死「别名表 + 估算来源」的行为，改版时先改 AA_FIELD_ALIASES 再改这里。

运行: python3.11 -m unittest discover -s 1-fetch -p 'test_*.py'
"""

import contextlib
import io
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fetch_aa_data import (  # noqa: E402
    AA_FIELD_ALIASES,
    MIN_FALLBACK_COVERAGE,
    derive_missing_indices,
    parse_models,
    pick_field,
    pick_index_source,
)


def rsc(models, extra_models=None):
    """构造最小可解析的 RSC 载荷：把模型数组塞进 "models":[...] 里。"""
    payload = list(models) + list(extra_models or [])
    return '{"head":"x"}\n"models":' + json.dumps(payload, ensure_ascii=False)


def parse_quiet(content):
    """解析载荷并吞掉脚本的进度日志，保持测试输出干净。"""
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        return parse_models(content)


def upstream_model(**overrides):
    """一条上游模型记录（2026-10 现役键名口径）。"""
    obj = {
        "shortName": "Test Model",
        "slug": "test-model",
        "creator": {"name": "TestCorp"},
        "releaseDate": "2026-09-01",
        "intelligenceIndex": 40.0,
        "sizeClass": "large",
        "isOpenWeights": False,
        "isReasoning": True,
        "inputModalityImage": True,
        "timescaleData": {"medianOutputSpeed": 50.0},
        "price1mInputTokens": 1.0,
        "price1mOutputTokens": 2.0,
    }
    obj.update(overrides)
    return obj


class TestAliasResolution(unittest.TestCase):
    def test_new_key_names_are_resolved(self):
        """2026-09 改名后的新键名必须被识别（本次事故的直接回归点）。"""
        models = parse_quiet(rsc([upstream_model(
            terminalBench21=0.55, tau2=0.42,
            tauBanking=0.31, apexAgents=0.22,
        )]))
        m = models[0]
        self.assertEqual(m["coding_index"], 55.0)
        self.assertEqual(m["agentic_index"], 42.0)
        self.assertEqual(m["coding_index_source"], "terminalbench_v21")
        self.assertEqual(m["agentic_index_source"], "tau2")
        self.assertEqual(m["tau_banking"], 0.31)
        self.assertEqual(m["apex_agents"], 0.22)
        self.assertTrue(m["input_image"])

    def test_legacy_key_names_still_work(self):
        """旧键名（terminalbenchV21）保留兼容，避免回滚/灰度时反而抓不到。"""
        models = parse_quiet(rsc([upstream_model(terminalbenchV21=0.6)]))
        self.assertEqual(models[0]["coding_index"], 60.0)

    def test_native_index_wins_over_estimate(self):
        """AA 若恢复原生 codingIndex/agenticIndex，则不得被估算覆盖。"""
        models = parse_quiet(rsc([upstream_model(
            codingIndex=71.5, agenticIndex=66.0, terminalBench21=0.10, tau2=0.10,
        )]))
        m = models[0]
        self.assertEqual(m["coding_index"], 71.5)
        self.assertEqual(m["agentic_index"], 66.0)
        self.assertFalse(m.get("coding_index_estimated", False))
        self.assertFalse(m.get("agentic_index_estimated", False))

    def test_pick_field_returns_first_non_null(self):
        self.assertIsNone(pick_field({"terminalBench21": None}, "terminalbench_v21"))
        self.assertEqual(pick_field({"terminalbenchV21": 0.5}, "terminalbench_v21"), 0.5)
        self.assertIsNone(pick_field({}, "terminalbench_v21"))

    def test_alias_table_covers_current_upstream_names(self):
        """别名表必须同时收录新旧键名，防止误删兼容项。"""
        self.assertIn("terminalBench21", AA_FIELD_ALIASES["terminalbench_v21"])
        self.assertIn("terminalbenchV21", AA_FIELD_ALIASES["terminalbench_v21"])
        self.assertIn("inputModalityImage", AA_FIELD_ALIASES["input_image"])


class TestIndexDerivation(unittest.TestCase):
    def test_missing_indices_stay_none_when_no_source(self):
        """来源全缺时保持 None —— 不编造数据。"""
        models = parse_quiet(rsc([upstream_model()]))
        m = models[0]
        self.assertIsNone(m["coding_index"])
        self.assertIsNone(m["agentic_index"])

    def test_source_priority_prefers_first_qualified(self):
        """terminalbench_v21 优先级最高（与旧 Coding Index 口径最接近）。"""
        models = [{"terminalbench_v21": 0.5, "terminalbench_hard": 0.9}] * 10
        self.assertEqual(pick_index_source(models, ("terminalbench_v21", "terminalbench_hard")),
                         "terminalbench_v21")

    def test_source_skips_undercovered_candidate(self):
        """覆盖率不足 25% 的评测不选作整批口径，退到下一个达标者。"""
        n = 20
        models = [{"terminalbench_v21": None, "terminalbench_v40": 0.5} for _ in range(n)]
        self.assertGreaterEqual(MIN_FALLBACK_COVERAGE, 0.1)
        self.assertEqual(pick_index_source(models, ("terminalbench_v21", "terminalbench_v40")),
                         "terminalbench_v40")

    def test_single_source_used_across_batch(self):
        """同一批模型只用一个估算来源，避免混口径。"""
        models = [{"tau2": 0.5}, {"tau_banking": 0.9}, {"tau2": 0.3}]
        stats = derive_missing_indices(models)
        self.assertEqual(stats["agentic_index"]["source"], "tau2")
        self.assertEqual(models[0]["agentic_index"], 50.0)
        self.assertIsNone(models[1]["agentic_index"])  # tau2 缺失的模型不跨源补值
        self.assertNotIn("agentic_index_source", models[1])

    def test_scaled_to_percent(self):
        models = [{"terminalbench_v21": 0.123}]
        derive_missing_indices(models)
        self.assertEqual(models[0]["coding_index"], 12.3)


class TestDriftReport(unittest.TestCase):
    def test_drift_report_flags_unknown_rename(self):
        """别名表未命中的键要在日志里报出来（改名后第一时间可见）。"""
        from fetch_aa_data import UPSTREAM_KEYS, report_field_drift
        UPSTREAM_KEYS.clear()
        UPSTREAM_KEYS.update({"intelligenceIndex", "terminalBench21"})  # 缺 agentic 系
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            report_field_drift()
        out = buf.getvalue()
        self.assertIn("上游字段漂移", out)
        self.assertIn("agentic_index", out)
        # coding/agentic 是官方已下线字段，只能出现在「已下线」信息行，不算漂移告警
        drift_line = next(l for l in out.splitlines() if "上游字段漂移" in l)
        self.assertNotIn("coding_index", drift_line)
        self.assertNotIn("agentic_index", drift_line)
        UPSTREAM_KEYS.clear()


if __name__ == "__main__":
    unittest.main()
