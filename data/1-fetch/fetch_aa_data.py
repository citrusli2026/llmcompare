#!/usr/bin/env python3
"""
Artificial Analysis 数据抓取脚本

从 https://artificialanalysis.ai/models 提取全量模型数据，
输出 aa_all_full.json (512模型) 和 aa_top64_full.json (前64)。

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

AA_MODELS_URL = "https://artificialanalysis.ai/models"
RSC_HEADERS = [
    "-H", "RSC: 1",
    "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
]
CURL_TIMEOUT = 120  # 秒

# ── JSON 对象提取 ─────────────────────────────────────

def extract_json_object(text: str, start: int) -> Optional[str]:
    """括号平衡匹配，提取从 start 位置开始的完整 JSON 对象"""
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
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]
        i += 1
    return None


def safe_dict(val) -> dict:
    """将 '$undefined' 字符串安全转为空 dict"""
    return val if isinstance(val, dict) else {}


# ── 模型解析 ──────────────────────────────────────────

def parse_models(content: str) -> List[dict]:
    """从 RSC 载荷解析所有模型对象"""
    model_starts = [m.start() for m in re.finditer(r'\{"additional_text":', content)]
    models = []

    for start in model_starts:
        obj_str = extract_json_object(content, start)
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
        intel_cost = safe_dict(obj.get('intelligence_index_cost'))
        intel_tokens = safe_dict(obj.get('intelligence_index_token_counts'))
        multi = safe_dict(obj.get('multilingual_aa'))
        perf = obj.get('performanceByPromptLength', []) or []

        perf_by_len = {p['prompt_length_type']: p for p in perf if isinstance(p, dict) and 'prompt_length_type' in p}
        long_perf = perf_by_len.get('long', {})
        medium_perf = perf_by_len.get('medium', {})
        short_perf = perf_by_len.get('short', {})

        model = {
            # Identity
            'short_name': obj.get('short_name', ''),
            'company': creator.get('name', ''),
            'slug': obj.get('slug', ''),
            'model_url': f"https://artificialanalysis.ai{obj.get('model_url', '')}",
            'logo': creator.get('logo_small_url', ''),
            'color': creator.get('color', ''),
            'release_date': obj.get('release_date'),

            # Main Indices
            'intelligence_index': obj.get('intelligence_index'),
            'coding_index': obj.get('coding_index'),
            'agentic_index': obj.get('agentic_index'),
            'omniscience': obj.get('omniscience'),

            # Benchmarks (14)
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

            # Pricing ($/M tokens)
            'price_input': obj.get('price_1m_input_tokens'),
            'price_output': obj.get('price_1m_output_tokens'),
            'index_compute': obj.get('indexCompute'),
            'index_tokens_total': obj.get('indexTokensTotal'),

            # Speed (tokens/s)
            'speed_median_tps': ts.get('median_output_speed'),
            'speed_p05_tps': ts.get('percentile_05_output_speed'),
            'speed_p95_tps': ts.get('percentile_95_output_speed'),
            'speed_short_tps': short_perf.get('median_output_speed') if short_perf else None,
            'speed_medium_tps': medium_perf.get('median_output_speed') if medium_perf else None,
            'speed_long_tps': long_perf.get('median_output_speed') if long_perf else None,

            # Latency (seconds)
            'ttft_seconds': ttft.get('total_time'),
            'e2e_total_seconds': e2e.get('total_time'),
            'e2e_answer_seconds': e2e.get('answer_time'),
            'e2e_reasoning_seconds': e2e.get('reasoning_time'),

            # Specs
            'context_window': obj.get('contextWindowFormatted') or str(obj.get('context_window_tokens', '')),
            'context_window_tokens': obj.get('context_window_tokens'),
            'parameters': obj.get('parameters'),
            'active_params_billions': obj.get('inference_parameters_active_billions'),
            'size_class': obj.get('size_class'),
            'output_tokens': obj.get('output_tokens'),

            # Modality
            'input_text': obj.get('input_modality_text'),
            'input_image': obj.get('input_modality_image'),
            'input_audio': obj.get('input_modality_speech'),
            'input_video': obj.get('input_modality_video'),
            'output_text': obj.get('output_modality_text'),
            'output_image': obj.get('output_modality_image'),
            'output_audio': obj.get('output_modality_speech'),
            'output_video': obj.get('output_modality_video'),

            # Tags & License
            'reasoning': obj.get('reasoning_model', False),
            'open_weights': obj.get('is_open_weights', False),
            'open_source_category': obj.get('open_source_categorization'),
            'commercial_allowed': obj.get('commercial_allowed'),
            'license': obj.get('license_name'),
            'frontier': obj.get('frontier_model', False),
            'knowledge_cutoff': obj.get('knowledge_cutoff_date'),

            # Multilingual (top languages)
            'multilingual_en': multi.get('en', {}).get('score') if isinstance(multi.get('en'), dict) else None,
            'multilingual_zh': multi.get('zh', {}).get('score') if isinstance(multi.get('zh'), dict) else None,
            'multilingual_ja': multi.get('ja', {}).get('score') if isinstance(multi.get('ja'), dict) else None,

            # Eval cost metadata
            'eval_input_cost': intel_cost.get('input_cost'),
            'eval_output_cost': intel_cost.get('output_cost'),
            'eval_total_cost': intel_cost.get('total_cost'),
            'eval_input_tokens': intel_tokens.get('input_tokens'),
            'eval_output_tokens': intel_tokens.get('output_tokens'),
        }
        models.append(model)

    return models


# ── 下载 RSC 载荷 ─────────────────────────────────────

def fetch_rsc(url: str, output_path: str) -> bool:
    """使用 curl 下载 RSC 载荷"""
    cmd = [
        "curl", "-sL", "--max-time", str(CURL_TIMEOUT),
        *RSC_HEADERS,
        url,
        "-o", output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=CURL_TIMEOUT + 10)
    if result.returncode != 0:
        print(f"  ❌ curl failed (exit code {result.returncode})")
        if result.stderr:
            print(f"  stderr: {result.stderr[:200]}")
        return False
    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        print(f"  ❌ Empty response file")
        return False
    return True


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
