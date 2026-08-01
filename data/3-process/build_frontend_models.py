#!/usr/bin/env python3
"""
Step 2: 从 AA 原始数据构建前端数据模型

原则:
  - 不做评分计算 (归一化/综合分/排序 → 留给前端 scoring.ts)
  - 不做主观裁断 (分层/tier → 留给前端)
  - 只做: 字段翻译 + 格式统一 + 类型推断 (开源/闭源) + URL 生成

用法: python3 build_frontend_models.py
输入: ../2-raw/aa_all_full.json (AA 全量数据)
输出: ../4-final/ranking_all.json (全量 Large + 前沿 Medium 模型)
"""

import json
import os
import re

from cn_classifier import is_cn_model
from text_utils import clean_name

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
AA_INPUT = os.path.join(PROJECT_DIR, '2-raw', 'aa_all_full.json')
OUTPUT = os.path.join(PROJECT_DIR, '4-final', 'ranking_all.json')

# 透传的单项 benchmark 字段（按覆盖率/重要性排序）。
# 入选门槛：在筛选后模型中覆盖率 > 30%（2026-08-01 实跑统计，见 main() 摘要输出）。
# 已废弃不上榜: humaneval / math_500 / aime / mmlu_pro（AA 上游不再提供或覆盖率 0%）。
# 注意各 benchmark 数值尺度不同：大多是 0-1 小数，gdpval 为绝对分值（约 5~1900），
# 管线保持原样透传，展示层（前端 lib/benchmarks.ts）负责格式化。
BENCHMARK_FIELDS = [
    'gpqa',                # 93.1%
    'hle',                 # 93.1%
    'scicode',             # 93.1%
    'lcr',                 # 87.5%
    'critpt',              # 86.7%
    'ifbench',             # 74.6%
    'tau2',                # 74.2%
    'terminalbench_hard',  # 73.8%
    'mmmu_pro',            # 49.2%
    'gdpval',              # 44.8%（绝对分值，非 0-1）
    'livecodebench',       # 41.5%
    'aime25',              # 35.5%
]


def make_id(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def make_logo(company: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '-', company.lower()).strip('-')
    return f'/logos/{slug}.svg'


def _blended_price(input_p, output_p):
    """加权混合价 (输入 75% + 输出 25%)，缺一为 None。"""
    if input_p is None or output_p is None:
        return None
    return round((input_p * 3 + output_p) / 4, 4)


def build_model(m: dict) -> dict:
    """
    统一转换: AA 扁平字段 → 前端 Model (嵌套结构)。
    不区分国内/国外，所有模型走同一路径。
    chinese_eval 由 is_cn_model() 动态判断。
    """
    raw_name = m.get('short_name', '')
    display_name = clean_name(raw_name)
    company = m.get('company', '')
    open_w = m.get('open_weights', False)
    intel = m.get('intelligence_index')
    cn = is_cn_model(m)

    # 美元定价显示
    p_in = m.get('price_input')
    p_out = m.get('price_output')
    if p_in is not None or p_out is not None:
        display = f"${p_in or '?'}/${p_out or '?'} (USD/百万token)"
    else:
        display = None

    # frontier: AA 已移除 frontier_model 字段，改用 size_class + 智商推导
    is_frontier = (
        m.get('size_class') == 'large'
        and (m.get('intelligence_index') or 0) >= 40
    )

    # parameters 优先取总参数量，缺失时用活跃参数量回填
    params = m.get('parameters')
    if params is None:
        params = m.get('active_params_billions')

    return {
        # ── 身份 ──
        'id': make_id(display_name),
        'name': display_name,
        'company': company,
        'type': '开源' if open_w else '闭源',
        'logo': make_logo(company),

        # ── AA 原始分数 ──
        'scores': {
            'intelligence': intel,
            'coding': m.get('coding_index'),
            'agentic': m.get('agentic_index'),
        },

        # ── AA 原始速度（含百分位）──
        'speed': {
            'median_tps': m.get('speed_median_tps'),
            'ttft_seconds': m.get('ttft_seconds'),
            'e2e_seconds': m.get('e2e_total_seconds'),
            'p05_tps': m.get('speed_p05_tps'),
            'p95_tps': m.get('speed_p95_tps'),
        },

        # 单个 benchmark 分数（字段清单见 BENCHMARK_FIELDS，原样透传）
        'benchmarks': {k: m.get(k) for k in BENCHMARK_FIELDS},

        # ── AA 原始定价 (美元) ──
        'pricing': {
            'input': p_in,
            'output': p_out,
            'blended': _blended_price(p_in, p_out),
            'display': display,
        },

        # ── 布尔标记 ──
        'flags': {
            'frontier': is_frontier,
            'open_weights': open_w,
            'reasoning': m.get('reasoning', False),
            'image_input': m.get('input_image', False),
            'chinese_eval': cn,
            'has_speed': m.get('speed_median_tps') is not None and (m.get('speed_median_tps') or 0) > 0,
            'has_pricing': p_in is not None or p_out is not None,
            'data_complete': intel is not None,
        },

        # ── 规格 ──
        'meta': {
            'context_window': m.get('context_window_tokens'),
            'size_class': m.get('size_class'),
            'parameters': params,
            'release_date': m.get('release_date'),
            'knowledge_cutoff': m.get('knowledge_cutoff'),
            'omniscience': m.get('omniscience'),
        },

        'url': m.get('model_url'),
    }


def main():
    if not os.path.exists(AA_INPUT):
        print(f'[ERROR] AA data not found: {AA_INPUT}')
        print('Run 1-fetch/fetch_aa_data.py first, or check 2-raw/ directory')
        return

    print(f'读取: {AA_INPUT}')
    with open(AA_INPUT, 'r', encoding='utf-8') as f:
        all_models = json.load(f)
    print(f'总模型数: {len(all_models)}')

    # ── 过滤: Large / frontier / 高智商中小模型 (策略 C: intel≥30) ──
    # 排除同系列旧代 (Qwen3.5→3.6, GLM-4→5), 避免多代并存显乱
    EXCLUDED_PATTERNS = ['Qwen3.5', 'GLM-4']
    filtered = [m for m in all_models
                if (m.get('size_class') == 'large'
                    or (m.get('intelligence_index') or 0) >= 30)
                and not any(p in m.get('short_name', '') for p in EXCLUDED_PATTERNS)]
    print(f'Large / 前沿模型: {len(filtered)} 个')

    # ── benchmark 字段覆盖率统计（>30% 才透传，门槛调整时看这里）──
    print('benchmark 覆盖率（筛选后模型）:')
    for k in BENCHMARK_FIELDS:
        n = sum(1 for m in filtered if m.get(k) is not None)
        print(f'  {k:<20} {n:>3}/{len(filtered)} ({n / len(filtered) * 100:.1f}%)')

    # ── 统一转换 ──
    models = [build_model(m) for m in filtered]

    # ── 去重：同名模型保留 intelligence 最高者 ──
    seen: dict[str, dict] = {}
    for m in models:
        key = m['id']
        if key not in seen or (m['scores']['intelligence'] or 0) > (seen[key]['scores']['intelligence'] or 0):
            seen[key] = m
    models = list(seen.values())
    print(f'去重后: {len(models)} 个模型')

    # ── 按 AA 原始 intelligence_index 降序排列 ──
    models.sort(key=lambda m: m['scores']['intelligence'] or 0, reverse=True)

    # ── 输出 ──
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(models, f, indent=2, ensure_ascii=False)

    # ── 摘要 ──
    complete = sum(1 for m in models if m['flags']['has_speed'] and m['flags']['data_complete'])
    frontier = sum(1 for m in models if m['flags']['frontier'])
    open_count = sum(1 for m in models if m['flags']['open_weights'])
    cn_count = sum(1 for m in models if m['flags']['chinese_eval'])
    intl_count = sum(1 for m in models if not m['flags']['chinese_eval'])

    print(f'输出: {OUTPUT} ({len(models)} 个模型，全量 Large + 前沿 Medium)')
    print(f'完整数据: {complete} | 前沿: {frontier} | 开源: {open_count} | 国内: {cn_count} | 国际: {intl_count}')
    print(f'排序: 按 AA intelligence_index 降序（enrich_models.py 后续按日期切出活跃模型）\n')

    print(f'=== Top 10 ===')
    for m in models[:10]:
        s = m['scores']
        sp = m['speed']
        p = m['meta']
        flags = []
        if m['flags']['frontier']: flags.append('前沿')
        if m['flags']['open_weights']: flags.append('开源')
        params = f"{p['parameters']}B" if p.get('parameters') else '-'
        tps_str = f"{sp['median_tps']:.0f}" if sp['median_tps'] else '-'
        print(f"  {m['name']:<42} intel={str(s['intelligence']).rjust(5)}  "
              f"tps={tps_str:>6}  "
              f"params={params:>8}  "
              f"{'|'.join(flags):<15}  {m['company']}")


if __name__ == '__main__':
    main()
