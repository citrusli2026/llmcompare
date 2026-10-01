#!/usr/bin/env python3
"""
Artificial Analysis 数据抓取脚本

从 https://artificialanalysis.ai/models 提取全量模型数据，
输出 aa_all_full.json 和 aa_top64_full.json。

2026-07-09: 适配 AA 新 RSC 格式 (initialModels 数组, camelCase 字段)
2026-08-07: AA 从 payload 中移除了 codingIndex 字段（官网同步下线 Coding Index，
编程评测并入 Intelligence Index v4.1.1 的 Terminal-Bench v2.1 / SciCode）。
coding_index 缺失时直接用 Terminal-Bench v2.1 原始得分（×100 转百分制）补齐，
并带 coding_index_estimated=True 标记；tbV21 也缺失则保持 None，不编造数据。
2026-10-01: AA 再次改版 —— 同时下线 agenticIndex，并把 terminalbenchV21 改名为
terminalBench21（另有 terminalBench40 / terminalBenchScience / tauBanking /
apexAgents / analystAgent / itBenchSre 等新评测）。原代码只认旧键名，导致
coding_index / agentic_index 全量变 None，前端「编程/Agent」场景与 data_complete
校验全面失败（2026-09-04 起 CI 连续失败 28 天）。
现改为：上游键名集中在 AA_FIELD_ALIASES 别名表，索引缺失时按「优先级 + 覆盖率门槛」
选取现役同类评测估算（terminalbench_v21/v40/hard 补 coding；tau2/tau_banking/... 补
agentic），并保留 *_estimated / *_source 标记便于溯源。上游改名时只需在别名表里
加一个键，其余逻辑无需改动。

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

# 单模型详情页包含全量 models 数组（570+），列表页 initialModels 仅 28 个。
# 主 URL 失败或解析模型数不足时，依次尝试备用详情页
# （备用 slug 取自 AA 当前排名前列、确实存在的模型详情页）。
AA_MODELS_URLS = [
    "https://artificialanalysis.ai/models/gpt-5-5",
    "https://artificialanalysis.ai/models/claude-opus-5",
    "https://artificialanalysis.ai/models/claude-fable-5",
    "https://artificialanalysis.ai/models/gpt-5-6-sol",
]
MIN_MODELS = 100  # 解析模型数低于此值视为抓取异常，尝试下一个备用 URL
RSC_HEADERS = [
    "-H", "RSC: 1",
    "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
]
CURL_TIMEOUT = 120  # 秒


# ── 上游字段别名表 ────────────────────────────────────
# AA 会不定期重命名/下线 RSC 载荷里的 camelCase 键，既不通知也不保留旧键
# （2026-08 删 codingIndex，2026-09 删 agenticIndex + terminalbenchV21→terminalBench21）。
# 每个内部字段按优先级列出候选上游键，解析时取第一个非 None 值。
# ⚠️ 上游再次改名时只需往元组里加一个键名，其余代码不用动。
AA_FIELD_ALIASES = {
    # 主指数
    'intelligence_index': ('intelligenceIndex',),
    'coding_index': ('codingIndex',),
    'agentic_index': ('agenticIndex',),
    # 终端 / 编程类评测（coding_index 缺失时的估算来源）
    'terminalbench_v21': ('terminalBench21', 'terminalbenchV21'),
    'terminalbench_v40': ('terminalBench40', 'terminalbenchV40'),
    'terminalbench_science': ('terminalBenchScience',),
    'terminalbench_hard': ('terminalbenchHard', 'terminalBenchHard'),
    # Agent 类评测（agentic_index 缺失时的估算来源）
    'tau2': ('tau2',),
    'tau_banking': ('tauBanking',),
    'apex_agents': ('apexAgents',),
    'analyst_agent': ('analystAgent',),
    'itbench_sre': ('itBenchSre', 'itbenchSre'),
    # 多模态输入（compare/detail 页「图像输入」徽章依赖）
    'input_image': ('inputModalityImage',),
}

# 估算来源优先级（0-1 小数，×100 转百分制）；按优先级取第一个覆盖率达标者，
# 保证同批模型口径一致；与旧指数口径最接近的评测排最前
CODING_INDEX_FALLBACKS = ('terminalbench_v21', 'terminalbench_v40', 'terminalbench_hard')
AGENTIC_INDEX_FALLBACKS = ('tau2', 'tau_banking', 'itbench_sre', 'analyst_agent', 'apex_agents')
MIN_FALLBACK_COVERAGE = 0.25  # 覆盖不足 25% 的评测不选作整批口径

# AA 已正式下线、只能靠估算的指数（字段漂移报告里不算异常）
KNOWN_REMOVED_INDICES = ('coding_index', 'agentic_index')


def pick_field(obj: dict, field: str):
    """按别名表取上游字段，返回第一个非 None 的值（全缺失返回 None）。"""
    for key in AA_FIELD_ALIASES.get(field, (field,)):
        val = obj.get(key)
        if val is not None:
            return val
    return None


def pick_index_source(models: List[dict], candidates) -> Optional[str]:
    """按优先级挑选估算来源：取第一个覆盖率达标者；全不达标则取覆盖最高的。

    优先级即 CODING_INDEX_FALLBACKS / AGENTIC_INDEX_FALLBACKS 的书写顺序
    （与旧指数口径最接近的评测排在最前），避免纯粹按覆盖率把口径换掉。
    """
    if not models:
        return None
    floor = max(1, int(len(models) * MIN_FALLBACK_COVERAGE))
    coverage = [(f, sum(1 for m in models if m.get(f) is not None)) for f in candidates]
    for field, n in coverage:
        if n >= floor:
            return field
    best_field, best_n = max(coverage, key=lambda kv: kv[1], default=(None, 0))
    return best_field if best_n > 0 else None


def derive_missing_indices(models: List[dict]) -> dict:
    """AA 下线 Coding / Agentic Index 后，用现役同类评测估算缺失指数。

    估算规则（不编造数据：来源全缺则保持 None）：
      · coding_index  ← terminalbench_v21 / v40 / hard 择优（×100 转百分制）
      · agentic_index ← tau2 / tau_banking / itbench_sre / analyst_agent / apex_agents 择优
    每个指数只选**一个**覆盖率达标的来源（优先级见常量顺序），避免同批模型混口径。
    写入 *_estimated / *_source 标记便于溯源。返回统计信息。
    """
    stats = {}
    for index_key, fallbacks in (('coding_index', CODING_INDEX_FALLBACKS),
                                 ('agentic_index', AGENTIC_INDEX_FALLBACKS)):
        missing = [m for m in models if m.get(index_key) is None]
        stats[index_key] = {'native': len(models) - len(missing), 'estimated': 0, 'source': None}
        if not missing:
            continue  # AA 恢复了原生字段，直接跳过估算
        source = pick_index_source(missing, fallbacks)
        if source is None:
            continue
        for m in missing:
            raw = m.get(source)
            if raw is None:
                m.setdefault(index_key, None)  # 该来源没覆盖到的模型保持 None，不跨源补值
                continue
            m[index_key] = round(raw * 100, 1)
            m[index_key + '_estimated'] = True
            m[index_key + '_source'] = source
            stats[index_key]['estimated'] += 1
        stats[index_key]['source'] = source
    return stats


def report_field_drift() -> None:
    """比对别名表期望键与上游实际键，改名/下线时在日志里明确指出。

    上游键集合由 parse_models_new 记录到 UPSTREAM_KEYS；未抓到载荷时跳过。
    已被 AA 正式下线、且有估算替代来源的指数（coding/agentic）不算漂移告警。
    """
    if not UPSTREAM_KEYS:
        return
    drift, retired = [], []
    for field, aliases in AA_FIELD_ALIASES.items():
        if any(k in UPSTREAM_KEYS for k in aliases):
            continue
        (retired if field in KNOWN_REMOVED_INDICES else drift).append(
            f"{field} ← {'/'.join(aliases)}")
    if retired:
        print(f"  ℹ️ 上游已下线指数（走估算来源）: {', '.join(retired)}")
    if drift:
        print(f"  ⚠️ 上游字段漂移（别名表未命中 {len(drift)} 项）: {', '.join(drift)}")
        print("     若为 AA 改名，请在 fetch_aa_data.py 的 AA_FIELD_ALIASES 补新键名")
    elif not retired:
        print(f"  ✅ 字段别名表全部命中上游载荷 ({len(AA_FIELD_ALIASES)} 项)")

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


# 最近一次解析到的上游原始键集合（供 report_field_drift 做漂移比对）
UPSTREAM_KEYS: set = set()


# ── 模型解析 (新格式 2026-07) ────────────────────────

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
        json_str = extract_json_array(content, start)
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

    # 记录上游原始键，供字段漂移比对（别名表未命中即代表 AA 改名/下线）
    UPSTREAM_KEYS.clear()
    for obj in best_models:
        UPSTREAM_KEYS.update(obj.keys())

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

            # Main Indices（上游键名走别名表，AA 改名时在 AA_FIELD_ALIASES 一处维护）
            'intelligence_index': pick_field(obj, 'intelligence_index'),
            'coding_index': pick_field(obj, 'coding_index'),
            'coding_index_estimated': False,  # 原生缺失时由 derive_missing_indices 估算并置 True
            'agentic_index': pick_field(obj, 'agentic_index'),
            'agentic_index_estimated': False,
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
            'tau2': pick_field(obj, 'tau2'),
            'tau_banking': pick_field(obj, 'tau_banking'),
            'apex_agents': pick_field(obj, 'apex_agents'),
            'analyst_agent': pick_field(obj, 'analyst_agent'),
            'itbench_sre': pick_field(obj, 'itbench_sre'),
            'terminalbench_hard': pick_field(obj, 'terminalbench_hard'),
            'terminalbench_v21': pick_field(obj, 'terminalbench_v21'),
            'terminalbench_v40': pick_field(obj, 'terminalbench_v40'),
            'terminalbench_science': pick_field(obj, 'terminalbench_science'),
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
            'input_image': pick_field(obj, 'input_image') or False,

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
    if not models:
        # 回退旧格式 (additional_text)
        models = parse_models_old(content)
        if models:
            print(f"  ✅ 使用旧格式 (additional_text): {len(models)} 模型")
    else:
        print(f"  ✅ 使用 models 数组 (详情页全量): {len(models)} 模型")

    if not models:
        print("  ⚠️ 新旧格式均未匹配到模型数据")
        return []

    # AA 已下线 codingIndex / agenticIndex：用现役同类评测估算（来源全缺则留 None）
    report_field_drift()
    stats = derive_missing_indices(models)
    for index_key, info in stats.items():
        if info['estimated']:
            print(f"  ℹ️ {index_key} 原生缺失，已用 {info['source']} 估算 "
                  f"{info['estimated']}/{len(models)} 模型（原生 {info['native']}）")
        elif info['native'] == 0:
            print(f"  ⚠️ {index_key} 全量缺失且无可用的替代评测来源")

    return models


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

    # ── Step 1+2: Download & Parse（主 URL 失败或解析不足时依次尝试备用详情页）──
    print("=" * 60)
    print("Step 1/3: Downloading RSC payload...")
    models = []
    content = None
    for url in AA_MODELS_URLS:
        print(f"  URL: {url}")
        if not fetch_rsc(url, rsc_path):
            print(f"  ⚠️ 下载失败，尝试下一个备用 URL...")
            continue
        size_mb = os.path.getsize(rsc_path) / (1024 * 1024)
        print(f"  ✅ Downloaded {size_mb:.1f} MB")

        print("\nStep 2/3: Parsing model data...")
        with open(rsc_path, 'r', encoding='utf-8') as f:
            content = f.read()
        models = parse_models(content)
        if len(models) >= MIN_MODELS:
            break
        print(f"  ⚠️ 仅解析到 {len(models)} 个模型 (<{MIN_MODELS})，尝试下一个备用 URL...")

    if len(models) < MIN_MODELS:
        # 所有 URL 均抓取失败或解析不足，尝试降级使用缓存数据
        if os.path.exists(all_path) and os.path.getsize(all_path) > 0:
            print(f"  ⚠️ 抓取失败，使用缓存数据: {all_path}")
            # exit 3 = 降级使用缓存，让管线感知 degraded 状态
            sys.exit(3)
        sys.exit(1)

    models.sort(key=lambda m: m['intelligence_index'] or 0, reverse=True)

    # ── 核心指数守卫：coding / agentic 双双归零 = 上游改版未被识别 ──
    # 此时绝不能把残缺数据写进 2-raw（会让前端编程/Agent 场景与 data_complete 校验全挂），
    # 而是降级复用上一份缓存 (exit 3)，由 pipeline 标记 degraded 并开告警 issue。
    if models:
        coding_n = sum(1 for m in models if m.get('coding_index') is not None)
        agentic_n = sum(1 for m in models if m.get('agentic_index') is not None)
        print(f"  指数覆盖率: coding={coding_n}/{len(models)}, agentic={agentic_n}/{len(models)}")
        if coding_n == 0 and agentic_n == 0:
            print("  ❌ coding_index 与 agentic_index 全量缺失 —— 疑似 AA 字段改名/下线")
            print("     请检查上方「上游字段漂移」提示，更新 AA_FIELD_ALIASES 或估算来源")
            if os.path.exists(all_path) and os.path.getsize(all_path) > 0:
                print(f"  ⚠️ 降级使用缓存数据: {all_path}")
                sys.exit(3)
            sys.exit(1)

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
