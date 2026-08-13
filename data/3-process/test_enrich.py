"""enrich_models.py 核心函数单元测试 (enrich / load_or_data)。

此前 enrich() 主函数(所有外部数据注入的唯一入口)无任何直接单测;
本文件覆盖注入逻辑与防御性修复 (E2 cn_pricing 缺键、E3 float(None)、0 价误判)。
运行: python3.11 -m unittest test_enrich -v
"""

import json
import tempfile
import unittest
from pathlib import Path

import enrich_models as E


def make_model(name="Test Model", company="TestCo", **extra) -> dict:
    m = {
        "id": name.lower().replace(" ", "-"),
        "name": name,
        "company": company,
        "type": "闭源",
        "logo": "",
        "url": "",
        "scores": {"intelligence": 50.0, "coding": None, "agentic": None},
        "speed": {"median_tps": None, "ttft_seconds": None, "e2e_seconds": None},
        "pricing": {"input": 3.0, "output": 15.0, "blended": 6.0, "display": ""},
        "flags": {
            "frontier": False,
            "open_weights": False,
            "reasoning": False,
            "image_input": False,
            "chinese_eval": False,
            "has_speed": False,
            "has_pricing": True,
            "data_complete": False,
            "tools_calling": None,
        },
        "meta": {},
        "benchmarks": {},
    }
    m.update(extra)
    return m


class TestLoadOrData(unittest.TestCase):
    """E3: OR 定价格式异常 (null/非数字) 不得使管线崩溃。"""

    def _run(self, models):
        data = {"data": {"models": models, "analytics": {}}}
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "or_models.json"
            path.write_text(json.dumps(data))
            return E.load_or_data(path)

    def test_null_pricing_skipped_gracefully(self):
        models = [
            {"name": "Good Model", "slug": "good", "pricing": {"prompt": 2.0, "completion": 8.0}},
            {"name": "Null Price", "slug": "nullp", "pricing": {"prompt": None, "completion": None}},
            {"name": "No Pricing", "slug": "nop"},
        ]
        token_map, price_map, *_ = self._run(models)
        self.assertEqual(price_map["good model"]["prompt"], 2_000_000.0)
        self.assertNotIn("null price", price_map)
        self.assertNotIn("no pricing", price_map)

    def test_string_pricing_skipped_gracefully(self):
        models = [{"name": "Bad Model", "slug": "bad", "pricing": {"prompt": "abc", "completion": 1.0}}]
        token_map, price_map, *_ = self._run(models)
        self.assertEqual(price_map, {})


class TestEnrichVendorLinks(unittest.TestCase):
    def test_only_homepage_and_console_kept(self):
        model = make_model("DeepSeek V4 Pro", company="DeepSeek")
        ref = {
            "vendor_links": {
                "DeepSeek": {
                    "homepage": "https://deepseek.com",
                    "console": "https://platform.deepseek.com",
                    "huggingface": "https://huggingface.co/deepseek",  # 应被过滤
                    "trial": "https://trial.example.com",              # 应被过滤
                }
            },
            "cn_pricing": {},
            "license": {},
        }
        E.enrich([model], ref)
        self.assertEqual(
            model["vendor_links"],
            {"homepage": "https://deepseek.com", "console": "https://platform.deepseek.com"},
        )

    def test_url_backfilled_from_homepage(self):
        model = make_model(company="DeepSeek", url="")
        ref = {
            "vendor_links": {"DeepSeek": {"homepage": "https://deepseek.com"}},
            "cn_pricing": {},
            "license": {},
        }
        E.enrich([model], ref)
        self.assertEqual(model["url"], "https://deepseek.com")


class TestEnrichCnPricing(unittest.TestCase):
    """E2: cn_pricing 注入 + 手维护表缺键防御。"""

    def _ref(self, cn_pricing):
        return {"vendor_links": {}, "cn_pricing": cn_pricing, "license": {}}

    def test_cn_pricing_injected_with_display(self):
        model = make_model("DeepSeek V4 Pro", company="DeepSeek")
        ref = self._ref({"DeepSeek V4 Pro": {"input": 6.5, "output": 27.0, "source": "platform.deepseek.com"}})
        E.enrich([model], ref)
        self.assertEqual(
            model["cn_pricing"],
            {"input": 6.5, "output": 27.0, "source": "platform.deepseek.com"},
        )
        self.assertIn("¥6.5/¥27.0", model["pricing"]["display"])

    def test_malformed_cn_pricing_entry_does_not_crash(self):
        # 缺 output 键的条目曾使整条管线 KeyError 崩溃
        model = make_model("DeepSeek V4 Pro", company="DeepSeek")
        ref = self._ref({"DeepSeek V4 Pro": {"input": 6.5}})
        E.enrich([model], ref)
        self.assertIsNone(model["cn_pricing"])
        # 其他模型不受影响
        model2 = make_model("DeepSeek V4 Flash", company="DeepSeek")
        ref2 = self._ref({"DeepSeek V4 Flash": {"input": 1.0, "output": 4.0, "source": "x"}})
        E.enrich([model2], ref2)
        self.assertEqual(model2["cn_pricing"]["output"], 4.0)

    def test_non_dict_cn_pricing_entry_does_not_crash(self):
        model = make_model("DeepSeek V4 Pro", company="DeepSeek")
        ref = self._ref({"DeepSeek V4 Pro": "just-a-string"})
        E.enrich([model], ref)
        self.assertIsNone(model["cn_pricing"])


class TestEnrichDisplayZeroPrice(unittest.TestCase):
    """0 价(免费模型)不能被 falsy 误判为 '?'。"""

    def test_intl_zero_price_displays_0(self):
        model = make_model("Free Model", company="OpenAI", pricing={"input": 0, "output": 0, "blended": 0, "display": ""})
        E.enrich([model], {"vendor_links": {}, "cn_pricing": {}, "license": {}})
        self.assertIn("$0/$0", model["pricing"]["display"])

    def test_intl_partial_missing_price(self):
        model = make_model("Partial Model", company="OpenAI", pricing={"input": None, "output": 5.0, "blended": None, "display": ""})
        E.enrich([model], {"vendor_links": {}, "cn_pricing": {}, "license": {}})
        self.assertIn("$?/$5.0", model["pricing"]["display"])


class TestEnrichLicense(unittest.TestCase):
    def test_open_weights_license_injected(self):
        model = make_model("Qwen3.6 27B", company="Alibaba", flags=dict(make_model().get("flags", {}), open_weights=True))
        ref = {"vendor_links": {}, "cn_pricing": {}, "license": {"Qwen3.6 27B": "Apache-2.0"}}
        E.enrich([model], ref)
        self.assertEqual(model["license"], "Apache-2.0")

    def test_company_default_license_fallback(self):
        model = make_model("Qwen3.6 27B", company="Alibaba", flags=dict(make_model().get("flags", {}), open_weights=True))
        ref = {
            "vendor_links": {},
            "cn_pricing": {},
            "license": {"_company_defaults": {"Alibaba": "Apache-2.0"}},
        }
        E.enrich([model], ref)
        self.assertEqual(model["license"], "Apache-2.0")

    def test_closed_model_not_in_license_map_is_none(self):
        # 闭源模型 license 数据层为 null (前端渲染"商业授权"); license_map 只含开源模型
        model = make_model("Claude Opus 5", company="Anthropic")
        ref = {"vendor_links": {}, "cn_pricing": {}, "license": {"Qwen3.6 27B": "Apache-2.0"}}
        E.enrich([model], ref)
        self.assertIsNone(model["license"])


class TestEnrichUsageTracking(unittest.TestCase):
    def test_usage_records_hits(self):
        model = make_model("DeepSeek V4 Pro", company="DeepSeek")
        ref = {
            "vendor_links": {"DeepSeek": {"homepage": "https://deepseek.com"}},
            "cn_pricing": {"DeepSeek V4 Pro": {"input": 6.5, "output": 27.0, "source": "s"}},
            "license": {},
        }
        usage = {"vendor_links": set(), "cn_pricing": set(), "license": set(), "arena_mapping": set()}
        E.enrich([model], ref, usage=usage)
        self.assertIn("DeepSeek", usage["vendor_links"])
        self.assertIn("DeepSeek V4 Pro", usage["cn_pricing"])


if __name__ == "__main__":
    unittest.main()
