#!/usr/bin/env python3
"""
Artificial Analysis 数据抓取脚本

从 https://artificialanalysis.ai/models 提取全量模型数据，
输出 aa_all_full.json 和 aa_top64_full.json。

2026-07-09: 适配 AA 新 RSC 格式 (initialModels 数组, camelCase 字段)

用法:
    python3 fetch_aa_data.py                          # 下载+解析，输出到当前目录
    python3 fetch_aa_data.py --keep-rsc               # 保留原始 RSC 载荷
    python3 fetch_aa_data.py --output /path/to/out/   # 指定输出目录

依赖: 标准库 (re, json) + curl (系统命令)
"""

import re
import json
import sys
import os
import subprocess
import argparse
from datetime import datetime
from typing import Optional, List

# ── 配置 ──────────────────────────────────────────────

# 单模型详情页包含全量 models 数组（570+），列表页 initialModels 仅 28 个
AA_MODELS_URL = "https://artificialanalysis.ai/models/gpt-5-5"
RSC_HEADERS = [
    "-H", "RSC: 1",
    "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
]
CURL_TIMEOUT = 120  # 秒

# ── JSON 对象提取 ─────────────────────────────────────

def extract_json_array(text: str, start: int) -> Optional[str]:
    """括号平衡匹配，提取从 start 位置开始的完整 JSON 数组"""
    depth = 0
    in_string = False
    escape = False
    i = start
    while i < len(text):
        ch = text[i]
        if escape:
            escape = False
            i += 1
            continue
        if ch == '\\':
            escape = True
        elif ch == '"':
            in_string = not in_string
        elif not in_string:
            if ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]
        i += 1
    return None


def safe_dict(val) -> dict:
    """将 '$undefined' 字符串安全转为空 dict"""
    return val if isinstance(val, dict) else {}


# ── 模型解析 (新格式 2026-07) ────────────────────────

def _extract_json_array_at(text: str, start: int) -> Optional[str]:
    """括号平衡匹配，提取从 start 位置开始的完整 JSON 数组（start 指向 [）"""
    depth = 0
    in_string = False
    escape = False
    i = start
    while i < len(text):
        ch = text[i]
        if escape:
            escape = False
            i += 1
            continue
        if ch == '\\':
            escape = True
        elif ch == '"':
            in_string = not in_string
        elif not in_string:
            if ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]
        i += 1
    return None


def parse_models_new(content: str) -> List[dict]:
    """从 RSC 载荷的 models 数组解析所有模型对象 (camelCase 格式)

    策略: 遍历所有 \"models\":[...] 数组，选包含 intelligenceIndex 字段的那个
    （即全量模型数据，而非仅有 slug/name 的轻量索引）
    """
    # 找所有 "models":[ 位置
    candidates = list(re.finditer(r'"models":\[', content))
    if not candidates:
        print("  ⚠️ 未找到 models 数组")
        return []

    best_models = []
    for cand in candidates:
        start = cand.end() - 1  # 包含 [
        json_str = _extract_json_array_at(content, start)
        if not json_str:
            continue
        try:
            raw = json.loads(json_str)
        except json.JSONDecodeError:
            continue
        # 过滤 RSC 引用字符串（如 "$c:props:..."）
        dicts = [o for o in raw if isinstance(o, dict)]
        if not dicts:
            continue
        # 检查是否有 intelligenceIndex → 全量数据
        has_intel = sum(1 for o in dicts if o.get('intelligenceIndex') is not None)
        if has_intel > len(best_models):
            best_models = dicts
            print(f"  候选 models 数组: {len(dicts)} 项, {has_intel} 有 intelligenceIndex")

    if not best_models:
        print("  ⚠️ 未找到含 intelligenceIndex 的 models 数组")
        return []

    models = []
    for obj in best_models:
        creator = safe_dict(obj.get('creator'))
        ts = safe_dict(obj.get('timescaleData'))
        e2e = safe_dict(obj.get('endToEndResponseTime'))
        ttft = safe_dict(obj.get('timeToFirstAnswerToken'))
        perf = safe_dict(obj.get('performanceByPromptType'))

        # 获取各 prompt 长度的性能数据
        long_perf = safe_dict(perf.get('long'))
        medium_perf = safe_dict(perf.get('medium'))
        short_perf = safe_dict(perf.get('short'))

        model = {
            # Identity
            'short_name': obj.get('shortName', ''),
            'company': creator.get('name', ''),
            'slug': obj.get('slug', ''),
            'model_url': f"https://artificialanalysis.ai/models/{obj.get('slug', '')}",
            'logo': creator.get('logo', ''),
            'color': creator.get('color', ''),
            'release_date': obj.get('releaseDate'),

            # Main Indices
            'intelligence_index': obj.get('intelligenceIndex'),
            'coding_index': obj.get('codingIndex'),
            'agentic_index': obj.get('agenticIndex'),
            'omniscience': obj.get('omniscience'),

            # Benchmarks (14)
            'gpqa': obj.get('gpqa'),
            'aime': obj.get('aime'),
            'aime25': obj.get('aime25'),
            'hle': obj.get('hle'),
            'mmlu_pro': obj.get('mmluPro'),
            'livecodebench': obj.get('livecodebench'),
            'math_500': obj.get('math500'),
            'mmmu_pro': obj.get('mmmuPro'),
            'scicode': obj.get('scicode'),
            'ifbench': obj.get('ifbench'),
            'humaneval': obj.get('humaneval'),
            'critpt': obj.get('critpt'),
            'lcr': obj.get('lcr'),
            'tau2': obj.get('tau2'),
            'terminalbench_hard': obj.get('terminalbenchHard'),
            'gdpval': obj.get('gdpval'),

            # Pricing ($/M tokens)
            'price_input': obj.get('price1mInputTokens'),
            'price_output': obj.get('price1mOutputTokens'),
            'index_compute': obj.get('intelligenceIndexCost'),
            'index_tokens_total': obj.get('canonicalIntelligenceIndexTokenCount'),

            # Speed (tokens/s)
            'speed_median_tps': ts.get('medianOutputSpeed'),
            'speed_p05_tps': None,  # 新格式中未提供
            'speed_p95_tps': None,  # 新格式中未提供
            'speed_short_tps': short_perf.get('medianOutputSpeed') if short_perf else None,
            'speed_medium_tps': medium_perf.get('medianOutputSpeed') if medium_perf else None,
            'speed_long_tps': long_perf.get('medianOutputSpeed') if long_perf else None,

            # Latency (seconds)
            'ttft_seconds': ttft.get('total'),
            'e2e_total_seconds': e2e.get('total'),
            'e2e_answer_seconds': e2e.get('answer'),
            'e2e_reasoning_seconds': e2e.get('reasoning'),

            # Specs
            'context_window': str(obj.get('contextWindowTokens', '')),
            'context_window_tokens': obj.get('contextWindowTokens'),
            'parameters': obj.get('parameters'),
            'active_params_billions': obj.get('inferenceParametersActiveBillions'),
            'size_class': obj.get('sizeClass'),
            'output_tokens': None,  # 新格式中未提供

            # Type flags
            'open_weights': obj.get('isOpenWeights', False),
            'reasoning_model': obj.get('isReasoning', False),
            'frontier_model': None,  # 新格式中已移除，需推导

            # Meta
            'knowledge_cutoff': obj.get('knowledgeCutoffDate'),
            'license': obj.get('licenseName'),
            'deprecated': obj.get('deprecated', False),
        }
        models.append(model)

    return models


# ── 旧格式解析 (兼容) ────────────────────────────────

def parse_models_old(content: str) -> List[dict]:
    """从 RSC 载荷解析所有模型对象 (旧格式, additional_text)"""
    model_starts = [m.start() for m in re.finditer(r'\{"additional_text":', content)]
    if not model_starts:
        return []

    models = []
    for start in model_starts:
        obj_str = extract_json_array(content, start)
        if not obj_str:
            continue
        try:
            obj = json.loads(obj_str)
        except json.JSONDecodeError:
            continue

        creator = obj.get('model_creators', {}) or {}
        ts = safe_dict(obj.get('timescaleData'))
        e2e = safe_dict(obj.get('end_to_end_response_time_metrics'))
        ttft = safe_dict(obj.get('time_to_first_answer_token_metrics'))
        perf = obj.get('performanceByPromptLength', []) or []

        perf_by_len = {p['prompt_length_type']: p for p in perf if isinstance(p, dict) and 'prompt_length_type' in p}
        long_perf = perf_by_len.get('long', {})
        medium_perf = perf_by_len.get('medium', {})
        short_perf = perf_by_len.get('short', {})

        model = {
            'short_name': obj.get('short_name', ''),
            'company': creator.get('name', ''),
            'slug': obj.get('slug', ''),
            'model_url': f"https://artificialanalysis.ai{obj.get('model_url', '')}",
            'logo': creator.get('logo_small_url', ''),
            'color': creator.get('color', ''),
            'release_date': obj.get('release_date'),
            'intelligence_index': obj.get('intelligence_index'),
            'coding_index': obj.get('coding_index'),
            'agentic_index': obj.get('agentic_index'),
            'omniscience': obj.get('omniscience'),
            'gpqa': obj.get('gpqa'),
            'aime': obj.get('aime'),
            'aime25': obj.get('aime25'),
            'hle': obj.get('hle'),
            'mmlu_pro': obj.get('mmlu_pro'),
            'livecodebench': obj.get('livecodebench'),
            'math_500': obj.get('math_500'),
            'mmmu_pro': obj.get('mmmu_pro'),
            'scicode': obj.get('scicode'),
            'ifbench': obj.get('ifbench'),
            'humaneval': obj.get('humaneval'),
            'critpt': obj.get('critpt'),
            'lcr': obj.get('lcr'),
            'tau2': obj.get('tau2'),
            'terminalbench_hard': obj.get('terminalbench_hard'),
            'gdpval': obj.get('gdpval'),
            'price_input': obj.get('price_1m_input_tokens'),
            'price_output': obj.get('price_1m_output_tokens'),
            'index_compute': obj.get('indexCompute'),
            'index_tokens_total': obj.get('indexTokensTotal'),
            'speed_median_tps': ts.get('median_output_speed'),
            'speed_p05_tps': ts.get('percentile_05_output_speed'),
            'speed_p95_tps': ts.get('percentile_95_output_speed'),
            'speed_short_tps': short_perf.get('median_output_speed') if short_perf else None,
            'speed_medium_tps': medium_perf.get('median_output_speed') if medium_perf else None,
            'speed_long_tps': long_perf.get('median_output_speed') if long_perf else None,
            'ttft_seconds': ttft.get('total_time'),
            'e2e_total_seconds': e2e.get('total_time'),
            'e2e_answer_seconds': e2e.get('answer_time'),
            'e2e_reasoning_seconds': e2e.get('reasoning_time'),
            'context_window': obj.get('contextWindowFormatted') or str(obj.get('context_window_tokens', '')),
            'context_window_tokens': obj.get('context_window_tokens'),
            'parameters': obj.get('parameters'),
            'active_params_billions': obj.get('inference_parameters_active_billions'),
            'size_class': obj.get('size_class'),
            'output_tokens': obj.get('output_tokens'),
            'open_weights': obj.get('is_open_weights', False),
            'reasoning_model': obj.get('reasoning_model', False),
            'frontier_model': obj.get('frontier_model'),
            'knowledge_cutoff': obj.get('knowledge_cutoff_date'),
            'license': obj.get('license_name'),
            'deprecated': obj.get('deprecated', False),
        }
        models.append(model)

    return models


def parse_models(content: str) -> List[dict]:
    """解析 RSC 载荷，优先尝试新格式，回退到旧格式"""
    # 尝试新格式 (initialModels)
    models = parse_models_new(content)
    if models:
        print(f"  ✅ 使用 models 数组 (详情页全量): {len(models)} 模型")
        return models

    # 回退旧格式 (additional_text)
    models = parse_models_old(content)
    if models:
        print(f"  ✅ 使用旧格式 (additional_text): {len(models)} 模型")
        return models

    print("  ⚠️ 新旧格式均未匹配到模型数据")
    return []


# ── RSC 下载 ──────────────────────────────────────────

def fetch_rsc(url: str, output_path: str, retries: int = 3, backoff: float = 2.0) -> bool:
    """下载 RSC 载荷，支持指数退避重试"""
    cmd = [
        "curl", "-sL", "--max-time", str(CURL_TIMEOUT),
        *RSC_HEADERS,
        url,
        "-o", output_path,
    ]
    last_error = None
    for attempt in range(retries):
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=CURL_TIMEOUT + 10)
        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return True
        last_error = result.stderr[:200] if result.stderr else f"exit code {result.returncode}"
        if attempt < retries - 1:
            sleep_time = backoff * (2 ** attempt)
            print(f"  ⚠️ curl attempt {attempt + 1}/{retries} failed: {last_error}. Retrying in {sleep_time:.0f}s...")
            import time
            time.sleep(sleep_time)
    print(f"  ❌ curl failed after {retries} attempts: {last_error}")
    return False


# ── 主流程 ────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch AI model data from Artificial Analysis")
    parser.add_argument("--keep-rsc", action="store_true", help="Keep raw RSC payload file")
    parser.add_argument("--output", "-o", default=".", help="Output directory (default: current dir)")
    args = parser.parse_args()

    out_dir = os.path.abspath(args.output)
    os.makedirs(out_dir, exist_ok=True)

    rsc_path = os.path.join(out_dir, "aa_models_rsc.txt")
    all_path = os.path.join(out_dir, "aa_all_full.json")
    top64_path = os.path.join(out_dir, "aa_top64_full.json")

    # ── Step 1: Download ──
    print("=" * 60)
    print("Step 1/3: Downloading RSC payload...")
    print(f"  URL: {AA_MODELS_URL}")
    success = fetch_rsc(AA_MODELS_URL, rsc_path)
    if not success:
        # 尝试使用缓存数据
        if os.path.exists(all_path) and os.path.getsize(all_path) > 0:
            print(f"  ⚠️ 抓取失败，使用缓存数据: {all_path}")
            sys.exit(0)
        sys.exit(1)
    size_mb = os.path.getsize(rsc_path) / (1024 * 1024)
    print(f"  ✅ Downloaded {size_mb:.1f} MB")

    # ── Step 2: Parse ──
    print("\nStep 2/3: Parsing model data...")
    with open(rsc_path, 'r', encoding='utf-8') as f:
        content = f.read()

    models = parse_models(content)
    models.sort(key=lambda m: m['intelligence_index'] or 0, reverse=True)

    print(f"  ✅ Parsed {len(models)} models")
    print(f"  Fields per model: {len(models[0]) if models else 0}")

    # Coverage stats
    if models:
        field_names = list(models[0].keys())
        top64 = models[:64]
        full_coverage = [f for f in field_names if all(m[f] is not None for m in top64)]
        partial = [f for f in field_names if f not in full_coverage]
        print(f"  Full coverage in Top64: {len(full_coverage)}/{len(field_names)} fields")
        if partial:
            print(f"  Partial coverage: {', '.join(partial[:10])}{'...' if len(partial)>10 else ''}")

    # ── Step 3: Save ──
    print(f"\nStep 3/3: Saving output files...")

    with open(all_path, 'w', encoding='utf-8') as f:
        json.dump(models, f, indent=2, ensure_ascii=False)
    print(f"  ✅ {all_path} ({len(models)} models)")

    with open(top64_path, 'w', encoding='utf-8') as f:
        json.dump(models[:64], f, indent=2, ensure_ascii=False)
    print(f"  ✅ {top64_path} (top 64)")

    # ── Cleanup ──
    if not args.keep_rsc:
        os.remove(rsc_path)
        print(f"  🗑️  Removed raw RSC file")

    # ── Summary ──
    print("\n" + "=" * 60)
    print("Top 5 by Intelligence Index:")
    for i, m in enumerate(models[:5]):
        speed = f"{m['speed_median_tps']:.0f}t/s" if m['speed_median_tps'] else 'N/A'
        price_in = f"${m['price_input']:.2f}" if m['price_input'] else 'N/A'
        price_out = f"${m['price_output']:.2f}" if m['price_output'] else 'N/A'
        print(f"  {i+1}. {m['short_name']} ({m['company']}) — Intel:{m['intelligence_index']} Speed:{speed} Price:{price_in}/{price_out}")

    print(f"\nFiles: {all_path}, {top64_path}")
    print("Done ✅")


if __name__ == "__main__":
    main()
