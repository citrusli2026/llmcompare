"""build_frontend_models.build_model() 单元测试。

重点覆盖 flags 字段翻译（reasoning 字段名映射曾长期错误）与身份字段。
运行: python3.11 -m unittest test_build_frontend_models -v
"""

import unittest

from build_frontend_models import build_model


def minimal(name: str, **extra) -> dict:
    m = {"short_name": name}
    m.update(extra)
    return m


class TestBuildModelIdentity(unittest.TestCase):
    def test_id_from_display_name(self):
        m = build_model(minimal("GPT-5.6"))
        self.assertEqual(m["id"], "gpt-5-6")

    def test_id_strips_trailing_variant_suffix(self):
        # clean_name 去掉末尾括号变体后缀, id 基于清理后的名字
        m = build_model(minimal("DeepSeek V4 Pro (High)"))
        self.assertEqual(m["name"], "DeepSeek V4 Pro")
        self.assertEqual(m["id"], "deepseek-v4-pro")

    def test_type_open_weights(self):
        m = build_model(minimal("Test", open_weights=True))
        self.assertEqual(m["type"], "开源")
        self.assertTrue(m["flags"]["open_weights"])

    def test_type_closed_weights(self):
        m = build_model(minimal("Test", open_weights=False))
        self.assertEqual(m["type"], "闭源")
        self.assertFalse(m["flags"]["open_weights"])

    def test_logo_slug_from_company(self):
        m = build_model(minimal("Test", company="Z AI"))
        self.assertEqual(m["logo"], "/logos/z-ai.svg")


class TestBuildModelReasoningFlag(unittest.TestCase):
    """AA 原始字段名是 reasoning_model; 曾误读 reasoning 导致标记恒为 false。"""

    def test_reasoning_true_from_reasoning_model(self):
        m = build_model(minimal("Test", reasoning_model=True))
        self.assertTrue(m["flags"]["reasoning"])

    def test_reasoning_false_when_reasoning_model_false(self):
        m = build_model(minimal("Test", reasoning_model=False))
        self.assertFalse(m["flags"]["reasoning"])

    def test_reasoning_false_when_field_absent(self):
        m = build_model(minimal("Test"))
        self.assertFalse(m["flags"]["reasoning"])

    def test_reasoning_legacy_key_fallback(self):
        # 兼容旧字段名 reasoning
        m = build_model(minimal("Test", reasoning=True))
        self.assertTrue(m["flags"]["reasoning"])


class TestBuildModelScores(unittest.TestCase):
    def test_scores_passthrough(self):
        m = build_model(minimal("Test", intelligence_index=55.0, coding_index=48.0, agentic_index=60.0))
        self.assertEqual(m["scores"]["intelligence"], 55.0)
        self.assertEqual(m["scores"]["coding"], 48.0)
        self.assertEqual(m["scores"]["agentic"], 60.0)

    def test_has_speed_requires_positive_median_tps(self):
        self.assertFalse(build_model(minimal("Test"))["flags"]["has_speed"])
        self.assertFalse(build_model(minimal("Test", speed_median_tps=0))["flags"]["has_speed"])
        self.assertTrue(build_model(minimal("Test", speed_median_tps=42.5))["flags"]["has_speed"])

    def test_data_complete_requires_intel(self):
        self.assertFalse(build_model(minimal("Test"))["flags"]["data_complete"])
        self.assertTrue(build_model(minimal("Test", intelligence_index=50))["flags"]["data_complete"])


class TestBuildModelPricing(unittest.TestCase):
    def test_pricing_blended_and_display(self):
        m = build_model(minimal("Test", price_input=3.0, price_output=15.0))
        self.assertEqual(m["pricing"]["input"], 3.0)
        self.assertEqual(m["pricing"]["output"], 15.0)
        # 75/25 加权: (3*3+15)/4 = 6
        self.assertEqual(m["pricing"]["blended"], 6.0)
        self.assertIn("$3.0/$15.0", m["pricing"]["display"])

    def test_pricing_zero_is_not_falsy(self):
        # 免费模型 price=0 不能显示为 '?'
        m = build_model(minimal("Test", price_input=0, price_output=0))
        self.assertEqual(m["pricing"]["input"], 0)
        self.assertIn("$0/$0", m["pricing"]["display"])

    def test_pricing_missing_is_none(self):
        m = build_model(minimal("Test"))
        self.assertIsNone(m["pricing"]["display"])


class TestBuildModelMeta(unittest.TestCase):
    def test_parameters_fallback_to_active_params(self):
        m = build_model(minimal("Test", parameters=None, active_params_billions=32))
        self.assertEqual(m["meta"]["parameters"], 32)

    def test_benchmarks_passthrough(self):
        m = build_model(minimal("Test", gpqa=0.85, hle=0.4))
        self.assertEqual(m["benchmarks"]["gpqa"], 0.85)
        self.assertEqual(m["benchmarks"]["hle"], 0.4)
        self.assertIsNone(m["benchmarks"]["scicode"])


if __name__ == "__main__":
    unittest.main()
