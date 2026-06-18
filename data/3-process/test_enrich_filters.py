"""
Tests for enrich_models 辅助函数:
  - filter_by_date (日期边界)
  - deduplicate_variants (变体简化)
  - _calculate_completeness (完整度权重)
"""

import os
import sys
import unittest
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from enrich_models import (
    _calculate_completeness,
    deduplicate_variants,
    filter_by_date,
)


# ════════════════════════════════════════════════════════════════
# filter_by_date
# ════════════════════════════════════════════════════════════════

class TestFilterByDate(unittest.TestCase):

    TODAY = datetime(2026, 6, 5)

    def test_recent_model_is_active(self):
        # 30 days ago, max_age 180
        m = {"name": "M1", "meta": {"release_date": "2026-05-06"}}
        active, stale = filter_by_date([m], 180, self.TODAY)
        self.assertEqual(len(active), 1)
        self.assertEqual(len(stale), 0)

    def test_old_model_is_stale(self):
        # 200 days ago, max_age 180
        m = {"name": "M1", "meta": {"release_date": "2025-11-17"}}
        active, stale = filter_by_date([m], 180, self.TODAY)
        self.assertEqual(len(active), 0)
        self.assertEqual(len(stale), 1)
        self.assertIn("200天前", stale[0][1])

    def test_boundary_exactly_max_age_is_active(self):
        # release_date == cutoff → 仍然算 active (因为 release >= cutoff)
        # today=2026-06-05, max_age=10 → cutoff=2026-05-26
        m = {"name": "M1", "meta": {"release_date": "2026-05-26"}}
        active, stale = filter_by_date([m], 10, self.TODAY)
        self.assertEqual(len(active), 1)
        self.assertEqual(len(stale), 0)

    def test_one_day_past_boundary_is_stale(self):
        m = {"name": "M1", "meta": {"release_date": "2026-05-25"}}
        active, stale = filter_by_date([m], 10, self.TODAY)
        self.assertEqual(len(active), 0)
        self.assertEqual(len(stale), 1)
        self.assertIn("11天前", stale[0][1])

    def test_no_release_date_is_stale(self):
        m = {"name": "M1", "meta": {}}
        active, stale = filter_by_date([m], 180, self.TODAY)
        self.assertEqual(len(active), 0)
        self.assertEqual(len(stale), 1)
        self.assertIn("无发布日期", stale[0][1])

    def test_bad_date_format_is_stale(self):
        m = {"name": "M1", "meta": {"release_date": "not-a-date"}}
        active, stale = filter_by_date([m], 180, self.TODAY)
        self.assertEqual(len(active), 0)
        self.assertEqual(len(stale), 1)
        self.assertIn("日期格式异常", stale[0][1])

    def test_empty_meta_release_date(self):
        m = {"name": "M1", "meta": {"release_date": ""}}
        active, stale = filter_by_date([m], 180, self.TODAY)
        self.assertEqual(len(active), 0)
        self.assertEqual(len(stale), 1)
        self.assertIn("无发布日期", stale[0][1])

    def test_mixed_active_and_stale(self):
        models = [
            {"name": "Recent", "meta": {"release_date": "2026-05-01"}},
            {"name": "Old", "meta": {"release_date": "2024-01-01"}},
            {"name": "NoDate", "meta": {}},
        ]
        active, stale = filter_by_date(models, 180, self.TODAY)
        self.assertEqual({m["name"] for m in active}, {"Recent"})
        self.assertEqual({m[0]["name"] for m in stale}, {"Old", "NoDate"})

    def test_empty_list(self):
        active, stale = filter_by_date([], 180, self.TODAY)
        self.assertEqual(active, [])
        self.assertEqual(stale, [])


# ════════════════════════════════════════════════════════════════
# deduplicate_variants
# ════════════════════════════════════════════════════════════════

class TestDeduplicateVariants(unittest.TestCase):

    def _m(self, name: str, intel: float | None) -> dict:
        return {"name": name, "scores": {"intelligence": intel}}

    def test_no_duplicates_unchanged(self):
        models = [self._m("Qwen3 Max", 60), self._m("GPT-4o", 55)]
        result = deduplicate_variants(models)
        self.assertEqual({m["name"] for m in result}, {"Qwen3 Max", "GPT-4o"})

    def test_duplicate_keeps_highest_intelligence(self):
        # GLM 5.x sub_group 配置: ['GLM-5.1', 'GLM-5']
        # 两个都在 → 留智能分高的
        models = [
            self._m("GLM-5.1", 55),
            self._m("GLM-5", 50),
        ]
        result = deduplicate_variants(models)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["name"], "GLM-5.1")

    def test_three_in_subgroup_keeps_only_top(self):
        # MiniMax M2: ['MiniMax-M2.7', 'MiniMax-M2.5', 'MiniMax-M2.1']
        models = [
            self._m("MiniMax-M2.7", 60),
            self._m("MiniMax-M2.5", 55),
            self._m("MiniMax-M2.1", 50),
        ]
        result = deduplicate_variants(models)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["name"], "MiniMax-M2.7")

    def test_different_subgroups_both_kept(self):
        # MiMo V2 Pro 和 Flash 属于不同 sub_group, 不互相合并
        models = [
            self._m("MiMo-V2.5-Pro", 60),
            self._m("MiMo-V2-Flash", 50),
        ]
        result = deduplicate_variants(models)
        self.assertEqual(len(result), 2)
        names = {m["name"] for m in result}
        self.assertEqual(names, {"MiMo-V2.5-Pro", "MiMo-V2-Flash"})

    def test_different_series_both_kept(self):
        models = [
            self._m("Qwen3.6 Max Preview", 60),
            self._m("GLM-5", 55),
        ]
        result = deduplicate_variants(models)
        self.assertEqual(len(result), 2)

    def test_only_one_variant_in_group_unchanged(self):
        # DeepSeek V4 Pro sub_group 只有 1 个名字, 单变体不触发合并
        models = [self._m("DeepSeek V4 Pro", 60)]
        result = deduplicate_variants(models)
        self.assertEqual(len(result), 1)

    def test_none_intelligence_treated_as_zero(self):
        # 缺 intelligence → 视为 0, 应被同组其他成员淘汰
        models = [
            self._m("MiMo-V2.5-Pro", None),
            self._m("MiMo-V2-Pro", 50),
        ]
        result = deduplicate_variants(models)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["name"], "MiMo-V2-Pro")

    def test_empty_list(self):
        self.assertEqual(deduplicate_variants([]), [])


# ════════════════════════════════════════════════════════════════
# _calculate_completeness
# ════════════════════════════════════════════════════════════════

class TestCalculateCompleteness(unittest.TestCase):
    """数据完整度百分比 = (有值字段加权 / 总权重) × 100"""

    def test_all_fields_present_returns_100(self):
        # 构造所有 COMPLETENESS_FIELDS 都有值的 model
        from enrich_models import COMPLETENESS_FIELDS
        model = {
            "scores": {"intelligence": 50, "coding": 40, "agentic": 45},
            "speed": {"median_tps": 100, "ttft_seconds": 1.0, "e2e_seconds": 5.0},
            "pricing": {"input": 1.0, "output": 2.0},
            "meta": {
                "context_window": 128000, "parameters": 70,
                "output_tokens": 8192, "release_date": "2026-01-01",
            },
            "url": "https://example.com",
            "vendor_links": {"homepage": "https://example.com"},
            "openrouter_pricing": {"prompt": 1, "completion": 2},
            "openrouter_weekly_tokens": 1000,
            "arena_rankings": {"text": {"rank": 1, "score": 1000}},
            "cn_pricing": {"input": 6.5, "output": 27.0, "source": "x"},
        }
        pct = _calculate_completeness(model)
        self.assertEqual(pct, 100.0)

    def test_all_fields_missing_returns_0(self):
        model = {}
        pct = _calculate_completeness(model)
        self.assertEqual(pct, 0.0)

    def test_partial_fields_proportional(self):
        # 只有 intelligence (weight 1.0), 假设总权重是 S
        # 应得 1.0 / S * 100
        from enrich_models import COMPLETENESS_FIELDS
        total_weight = sum(COMPLETENESS_FIELDS.values())
        model = {"scores": {"intelligence": 50}}
        pct = _calculate_completeness(model)
        expected = round(1.0 / total_weight * 100, 1)
        self.assertEqual(pct, expected)

    def test_zero_counts_as_present(self):
        # int/float 类型的 0 视为"有值" (与 falsy 区分)
        model = {
            "scores": {"intelligence": 0, "coding": 0, "agentic": 0},
            "speed": {"median_tps": 0, "ttft_seconds": 0, "e2e_seconds": 0},
            "pricing": {"input": 0, "output": 0},
        }
        # 上面所有数值字段 (权重 1.0) 都有值, 应得高分
        # 但元数据 / 链接 / OR / Arena / cn_pricing 都没有
        pct = _calculate_completeness(model)
        self.assertGreater(pct, 30)  # 大致: 8 个 weight-1.0 字段

    def test_empty_string_counts_as_missing(self):
        # str 类型空字符串视为"无值"
        from enrich_models import COMPLETENESS_FIELDS
        # total_weight 计算 (只算有值的)
        # scores.intelligence (1.0) 有, 其它都为 0
        model = {
            "scores": {"intelligence": 50},
            "meta": {"context_window": ""},  # 空字符串
            "url": "",
        }
        pct = _calculate_completeness(model)
        # 只有 intelligence 1.0 有值
        total_weight = sum(COMPLETENESS_FIELDS.values())
        expected = round(1.0 / total_weight * 100, 1)
        self.assertEqual(pct, expected)

    def test_empty_dict_counts_as_missing(self):
        # dict 空 {} 视为"无值"
        model = {
            "scores": {"intelligence": 50},
            "vendor_links": {},  # 空 dict
            "arena_rankings": {},  # 空 dict
            "openrouter_pricing": {},  # 空 dict
        }
        pct = _calculate_completeness(model)
        # 上面这些都是 0 权重不算分 (除了 intelligence)
        from enrich_models import COMPLETENESS_FIELDS
        total_weight = sum(COMPLETENESS_FIELDS.values())
        expected = round(1.0 / total_weight * 100, 1)
        self.assertEqual(pct, expected)


if __name__ == "__main__":
    unittest.main()
