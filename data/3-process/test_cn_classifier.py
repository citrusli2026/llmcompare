"""
Tests for cn_classifier — single source of truth for 国内模型识别.

新增国内厂商时, 修改 CN_COMPANIES / CN_MODEL_NAMES 列表即可。
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cn_classifier import (
    CN_COMPANIES,
    CN_MODEL_NAMES,
    is_cn_company,
    is_cn_model,
    is_cn_model_name,
)


class TestIsCnCompany(unittest.TestCase):

    def test_exact_match_lowercase(self):
        self.assertTrue(is_cn_company("alibaba"))

    def test_case_insensitive(self):
        self.assertTrue(is_cn_company("Alibaba"))
        self.assertTrue(is_cn_company("ALIBABA"))

    def test_substring_match(self):
        # "Alibaba Cloud" contains "alibaba"
        self.assertTrue(is_cn_company("Alibaba Cloud"))

    def test_non_cn_company(self):
        self.assertFalse(is_cn_company("OpenAI"))
        self.assertFalse(is_cn_company("Anthropic"))
        self.assertFalse(is_cn_company("Google"))

    def test_empty_string(self):
        self.assertFalse(is_cn_company(""))

    def test_none_safe(self):
        self.assertFalse(is_cn_company(None))

    def test_lists_are_non_empty(self):
        # Sanity: ensure the lists are populated
        self.assertGreater(len(CN_COMPANIES), 0)
        self.assertGreater(len(CN_MODEL_NAMES), 0)


class TestIsCnModelName(unittest.TestCase):

    def test_qwen_match(self):
        self.assertTrue(is_cn_model_name("Qwen3 Max"))
        self.assertTrue(is_cn_model_name("qwen-7b"))

    def test_glm_dash(self):
        # "glm-" is a marker, not a complete word
        self.assertTrue(is_cn_model_name("GLM-4 Plus"))

    def test_deepseek(self):
        self.assertTrue(is_cn_model_name("DeepSeek V3"))

    def test_non_cn_model(self):
        self.assertFalse(is_cn_model_name("GPT-4"))
        self.assertFalse(is_cn_model_name("Claude 3.5"))
        self.assertFalse(is_cn_model_name("Llama 3"))

    def test_empty_string(self):
        self.assertFalse(is_cn_model_name(""))

    def test_none_safe(self):
        self.assertFalse(is_cn_model_name(None))


class TestIsCnModel(unittest.TestCase):
    """联合判定: 公司名 OR 模型名 任一命中即视为国内"""

    def test_cn_company_only(self):
        m = {"company": "Alibaba", "short_name": "gpt-4-clone"}
        self.assertTrue(is_cn_model(m))

    def test_cn_model_name_only(self):
        m = {"company": "MysteryCo", "short_name": "Qwen-Foo"}
        self.assertTrue(is_cn_model(m))

    def test_both_cn(self):
        m = {"company": "Alibaba", "short_name": "Qwen"}
        self.assertTrue(is_cn_model(m))

    def test_neither_cn(self):
        m = {"company": "OpenAI", "short_name": "GPT-4"}
        self.assertFalse(is_cn_model(m))

    def test_missing_fields(self):
        # Missing keys should not crash
        self.assertFalse(is_cn_model({}))
        self.assertFalse(is_cn_model({"company": "OpenAI"}))
        self.assertFalse(is_cn_model({"short_name": "GPT-4"}))

    def test_none_values(self):
        m = {"company": None, "short_name": None}
        self.assertFalse(is_cn_model(m))


if __name__ == "__main__":
    unittest.main()
