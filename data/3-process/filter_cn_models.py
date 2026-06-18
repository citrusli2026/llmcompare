#!/usr/bin/env python3
"""
⚠️ 已从主管线移除 — 仅保留作为独立诊断工具。
主管线 (build_frontend_models.py) 现在直接从 aa_all_full.json 读取所有模型，
不再需要单独的国内筛选步骤。

历史用途:
  从 AA 全量数据中筛选国内模型
规则: 模型厂商或名称匹配国内关键词
用法: python3 filter_cn_models.py
输入: ../2-raw/aa_all_full.json
输出: cn_models_filtered.json (同目录)
     + 与 data/cn_models_filtered.json 对比报告
"""

import json
import os
import sys

from cn_classifier import is_cn_model

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
INPUT = os.path.join(PROJECT_DIR, '2-raw', 'aa_all_full.json')
OUTPUT = os.path.join(SCRIPT_DIR, 'cn_models_filtered.json')
PREV = OUTPUT + '.prev'  # 上一版, 用于对比本次输出与上次差异
EXISTING = PREV


def transform(m: dict) -> dict:
    return {
        'model': m.get('short_name', ''),
        'company': m.get('company', ''),
        'scores': {
            'intelligence': m.get('intelligence_index'),
            'coding': m.get('coding_index'),
            'agentic': m.get('agentic_index'),
        },
        'speed': {
            'median_tps': m.get('speed_median_tps'),
            'ttft_seconds': m.get('ttft_seconds'),
            'e2e_seconds': m.get('e2e_total_seconds'),
            'p05_tps': m.get('speed_p05_tps'),
            'p95_tps': m.get('speed_p95_tps'),
        },
        'pricing': {
            'input': m.get('price_input'),
            'output': m.get('price_output'),
        },
        'benchmarks': {
            'gpqa': m.get('gpqa'),
            'hle': m.get('hle'),
            'mmlu_pro': m.get('mmlu_pro'),
            'mmmu_pro': m.get('mmmu_pro'),
            'omniscience': m.get('omniscience'),
        },
        'multilingual_zh': m.get('multilingual_zh'),
        'meta': {
            'context_window': m.get('context_window_tokens'),
            'size_class': m.get('size_class'),
            'parameters': m.get('parameters'),
            'output_tokens': m.get('output_tokens'),
            'reasoning': m.get('reasoning') or False,
            'open_weights': m.get('open_weights') or False,
            'frontier': m.get('frontier') or False,
            'release_date': m.get('release_date'),
        },
        'modality': {
            'input_image': m.get('input_image') or False,
            'input_audio': m.get('input_audio') or False,
            'output_image': m.get('output_image') or False,
        },
        'url': m.get('model_url'),
    }


def deep_equal(a, b, path=''):
    """递归比较两个结构，返回差异列表"""
    diffs = []
    if type(a) != type(b):
        diffs.append(f'{path}: type mismatch ({type(a).__name__} vs {type(b).__name__})')
    elif isinstance(a, dict):
        keys_a = set(a.keys())
        keys_b = set(b.keys())
        for k in keys_a - keys_b:
            diffs.append(f'{path}.{k}: only in new')
        for k in keys_b - keys_a:
            diffs.append(f'{path}.{k}: only in existing')
        for k in keys_a & keys_b:
            diffs.extend(deep_equal(a[k], b[k], f'{path}.{k}'))
    elif isinstance(a, list):
        if len(a) != len(b):
            diffs.append(f'{path}: length mismatch ({len(a)} vs {len(b)})')
        else:
            for i in range(len(a)):
                diffs.extend(deep_equal(a[i], b[i], f'{path}[{i}]'))
    elif isinstance(a, float):
        if abs(a - b) > 1e-6:
            diffs.append(f'{path}: {a} vs {b}')
    else:
        if a != b:
            diffs.append(f'{path}: {a!r} vs {b!r}')
    return diffs


def main():
    # ── 0. 保留上一版, 用于跑完后做"新旧对比" ──
    if os.path.exists(OUTPUT):
        import shutil
        shutil.copy2(OUTPUT, PREV)
        print(f'保留上一版: {PREV}')

    # ── 1. 读取原始数据 ──
    print(f'读取: {INPUT}')
    with open(INPUT, 'r', encoding='utf-8') as f:
        all_models = json.load(f)
    print(f'总模型数: {len(all_models)}')

    # ── 2. 过滤 ──
    cn_models = [m for m in all_models if is_cn_model(m)]
    cn_models.sort(key=lambda m: m.get('intelligence_index') or 0, reverse=True)
    print(f'国内模型: {len(cn_models)}')

    # ── 3. 转换格式 ──
    output = [transform(m) for m in cn_models]

    # ── 4. 保存 ──
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f'输出: {OUTPUT} ({len(output)} 个模型)')

    # ── 5. 摘要 ──
    frontier = sum(1 for m in output if m['meta']['frontier'])
    has_speed = sum(1 for m in output if m['speed']['median_tps'])
    has_zh = sum(1 for m in output if m['multilingual_zh'] is not None)
    print(f'\n总计: {len(output)} | 前沿: {frontier} | 有速度: {has_speed} | 中文评测: {has_zh}')
    print()

    for m in output:
        flags = []
        if m['meta']['frontier']: flags.append('前沿')
        if m['multilingual_zh'] is not None: flags.append('中文')
        if m['meta']['open_weights']: flags.append('开源')
        if m['meta']['reasoning']: flags.append('推理')
        if m['speed']['median_tps'] is None or m['speed']['median_tps'] == 0: flags.append('无速度')

        intel = str(m['scores']['intelligence'] or '-').rjust(5)
        speed = f"{m['speed']['median_tps']:.0f} t/s".rjust(7) if m['speed']['median_tps'] else '-'.rjust(7)
        price_in = f"${m['pricing']['input']:.2f}".rjust(7) if m['pricing']['input'] else '-'.rjust(7)
        flag_str = '|'.join(flags)

        print(f"  {m['model']:<38} {intel} {speed} {price_in} {flag_str:<25} {m['company']}")

    # ── 6. 与现有数据对比 ──
    print('\n' + '=' * 60)
    print('对比现有数据:')
    if not os.path.exists(EXISTING):
        print(f'  ⚠️ 现有文件不存在: {EXISTING}')
        return

    with open(EXISTING, 'r', encoding='utf-8') as f:
        existing_data = json.load(f)
    print(f'  现有: {len(existing_data)} 个模型')
    print(f'  新抓: {len(output)} 个模型')

    # 用 model_url 做唯一 key（同一模型名可能有多个 variant）
    existing_by_key = {}
    for m in existing_data:
        key = m.get('url', f"{m['model']}|{m['company']}")
        existing_by_key[key] = m

    new_by_key = {}
    for m in output:
        key = m.get('url', f"{m['model']}|{m['company']}")
        new_by_key[key] = m

    existing_keys = set(existing_by_key.keys())
    new_keys = set(new_by_key.keys())

    only_existing = existing_keys - new_keys
    only_new = new_keys - existing_keys
    common = existing_keys & new_keys

    if only_existing:
        print(f'\n  仅旧数据有 ({len(only_existing)}):')
        for k in sorted(only_existing)[:10]:
            print(f'    - {k}')
        if len(only_existing) > 10:
            print(f'    ... 还有 {len(only_existing) - 10} 个')

    if only_new:
        print(f'\n  仅新数据有 ({len(only_new)}):')
        for k in sorted(only_new)[:10]:
            print(f'    + {k}')
        if len(only_new) > 10:
            print(f'    ... 还有 {len(only_new) - 10} 个')

    # 对共同模型做字段级对比
    mismatches = 0
    for key in sorted(common)[:20]:  # 只检查前20个避免输出爆炸
        existing = existing_by_key[key]
        new = new_by_key[key]
        diffs = deep_equal(new, existing, key)
        if diffs:
            mismatches += 1
            print(f'\n  ✗ {key}:')
            for d in diffs[:5]:
                print(f'      {d}')
            if len(diffs) > 5:
                print(f'      ... 还有 {len(diffs) - 5} 处差异')

    print(f'\n  共同模型: {len(common)}')
    print(f'  仅旧: {len(only_existing)}, 仅新: {len(only_new)}')
    if mismatches == 0 and len(common) > 0:
        print(f'  ✅ 抽样 {min(20, len(common))} 个共同模型，字段完全一致')
    elif mismatches:
        print(f'  ⚠️ {mismatches}/{min(20, len(common))} 个模型有字段差异（数据更新时间不同导致）')

    if not only_existing and not only_new and mismatches == 0:
        print('\n  🎉 新旧数据完全一致！')


if __name__ == '__main__':
    main()
