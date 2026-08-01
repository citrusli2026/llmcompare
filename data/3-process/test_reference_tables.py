"""
Tests for 0-refer 手工表外置加载与未命中报告:
  - resolve_variant_groups (enrich_models): model_reference.json 优先，缺键回退默认
  - resolve_excluded_patterns (build_frontend_models): 同上
  - report_unmatched_reference (enrich_models): 按表分组列出未命中条目
"""

import io
import os
import sys
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from enrich_models import (
    DEFAULT_VARIANT_GROUPS,
    VARIANT_GROUPS,
    report_unmatched_reference,
    resolve_variant_groups,
)
from build_frontend_models import (
    DEFAULT_EXCLUDED_PATTERNS,
    resolve_excluded_patterns,
)


class TestResolveVariantGroups(unittest.TestCase):

    def test_valid_key_from_ref_wins(self):
        ref = {"variant_groups": {"Foo": {"Bar": ["Foo Bar"]}}}
        self.assertEqual(resolve_variant_groups(ref), {"Foo": {"Bar": ["Foo Bar"]}})

    def test_missing_key_falls_back_to_default(self):
        with redirect_stdout(io.StringIO()) as buf:
            result = resolve_variant_groups({})
        self.assertEqual(result, DEFAULT_VARIANT_GROUPS)
        self.assertIn("[WARN]", buf.getvalue())

    def test_empty_dict_falls_back_to_default(self):
        with redirect_stdout(io.StringIO()):
            result = resolve_variant_groups({"variant_groups": {}})
        self.assertEqual(result, DEFAULT_VARIANT_GROUPS)

    def test_wrong_type_falls_back_to_default(self):
        with redirect_stdout(io.StringIO()):
            result = resolve_variant_groups({"variant_groups": ["not", "a", "dict"]})
        self.assertEqual(result, DEFAULT_VARIANT_GROUPS)

    def test_module_level_groups_loaded_from_reference_file(self):
        # 模块级 VARIANT_GROUPS 来自 0-refer/model_reference.json，
        # 内容与代码内置默认值保持一致
        self.assertEqual(VARIANT_GROUPS, DEFAULT_VARIANT_GROUPS)


class TestResolveExcludedPatterns(unittest.TestCase):

    def test_valid_key_from_ref_wins(self):
        ref = {"excluded_patterns": ["Qwen3.4"]}
        self.assertEqual(resolve_excluded_patterns(ref), ["Qwen3.4"])

    def test_missing_key_falls_back_to_default(self):
        with redirect_stdout(io.StringIO()) as buf:
            result = resolve_excluded_patterns({})
        self.assertEqual(result, DEFAULT_EXCLUDED_PATTERNS)
        self.assertIn("[WARN]", buf.getvalue())

    def test_empty_list_falls_back_to_default(self):
        with redirect_stdout(io.StringIO()):
            result = resolve_excluded_patterns({"excluded_patterns": []})
        self.assertEqual(result, DEFAULT_EXCLUDED_PATTERNS)


class TestReportUnmatchedReference(unittest.TestCase):

    def _ref(self):
        return {
            "cn_pricing": {"Model A": {}, "Model B": {}, "Model C": {}},
            "vendor_links": {"VendorX": {}, "VendorY": {}},
            "license": {"_note": "x", "_company_defaults": {"VendorX": "MIT"}, "Model A": "MIT", "Model Z": "Apache 2.0"},
            "arena_name_mapping": {"Model A": ["a"], "Model Q": ["q"]},
        }

    def test_lists_only_unmatched_entries_grouped(self):
        usage = {
            "cn_pricing": {"Model A"},
            "vendor_links": {"VendorX"},
            "license": {"Model A"},
            "arena_mapping": {"Model A"},
        }
        with redirect_stdout(io.StringIO()) as buf:
            report_unmatched_reference(self._ref(), usage)
        out = buf.getvalue()

        # 分组标题 + 数量
        self.assertIn("cn_pricing (model_reference.json): 2/3 未命中", out)
        self.assertIn("vendor_links (model_reference.json): 1/2 未命中", out)
        self.assertIn("license (model_reference.json): 1/2 未命中", out)
        self.assertIn("arena_name_mapping.json: 1/2 未命中", out)

        # 未命中条目被列出，命中条目不出现
        self.assertIn("· Model B", out)
        self.assertIn("· Model C", out)
        self.assertIn("· VendorY", out)
        self.assertIn("· Model Z", out)
        self.assertIn("· Model Q", out)
        self.assertNotIn("· Model A", out)
        self.assertNotIn("· VendorX", out)

        # 下划线前缀的 license 元键不参与统计
        self.assertNotIn("_note", out)
        self.assertNotIn("_company_defaults", out)

    def test_all_hit_reports_zero(self):
        usage = {
            "cn_pricing": {"Model A", "Model B", "Model C"},
            "vendor_links": {"VendorX", "VendorY"},
            "license": {"Model A", "Model Z"},
            "arena_mapping": {"Model A", "Model Q"},
        }
        with redirect_stdout(io.StringIO()) as buf:
            report_unmatched_reference(self._ref(), usage)
        out = buf.getvalue()
        self.assertIn("cn_pricing (model_reference.json): 0/3 未命中", out)
        self.assertNotIn("· ", out)

    def test_empty_ref_reports_zero(self):
        with redirect_stdout(io.StringIO()) as buf:
            report_unmatched_reference({}, {"cn_pricing": set(), "vendor_links": set(), "license": set(), "arena_mapping": set()})
        out = buf.getvalue()
        self.assertIn("0/0 未命中", out)


if __name__ == "__main__":
    unittest.main()
