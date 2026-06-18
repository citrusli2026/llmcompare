"""
Tests for text_utils — clean_name() 等公用工具。
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from text_utils import clean_name


class TestCleanName(unittest.TestCase):
    """去掉末尾括号内的变体后缀: (Max) / (High) / (xhigh) / (Feb 2026)"""

    def test_max_suffix(self):
        self.assertEqual(clean_name("DeepSeek V4 Pro (Max)"), "DeepSeek V4 Pro")

    def test_high_suffix(self):
        self.assertEqual(clean_name("DeepSeek V4 Pro (High)"), "DeepSeek V4 Pro")

    def test_lowercase_suffix(self):
        self.assertEqual(clean_name("GLM-5 (xhigh)"), "GLM-5")

    def test_date_suffix(self):
        self.assertEqual(clean_name("Qwen3 (Feb 2026)"), "Qwen3")

    def test_no_suffix_unchanged(self):
        self.assertEqual(clean_name("Kimi K2.6"), "Kimi K2.6")

    def test_only_trailing_parens_stripped(self):
        # "GPT-4 (Vision) Turbo" — "Turbo" 在括号外, 不应被去掉
        self.assertEqual(clean_name("GPT-4 (Vision) Turbo"), "GPT-4 (Vision) Turbo")

    def test_empty_string(self):
        self.assertEqual(clean_name(""), "")

    def test_none_safe(self):
        # None should not crash
        self.assertIsNone(clean_name(None))

    def test_whitespace_after_strip(self):
        # "Name (suffix) " — trailing whitespace should also be cleaned
        self.assertEqual(clean_name("Name (suffix) "), "Name")
        self.assertEqual(clean_name("Name (suffix)\t"), "Name")

    def test_empty_parens_not_stripped(self):
        # 正则 \([^)]+\) 要求至少 1 个字符, 空括号 () 视为"非变体后缀"保留
        self.assertEqual(clean_name("Model ()"), "Model ()")


if __name__ == "__main__":
    unittest.main()
