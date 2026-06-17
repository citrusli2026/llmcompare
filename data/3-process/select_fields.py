#!/usr/bin/env python3
"""
Step 2: 从国内模型列表中筛选需要的字段，输出最终模型数据
用法: python3 select_fields.py
输入: cn_models_filtered.json (Step 1 输出)
输出: ../4-final/models.json (供前端使用)
     + ../4-final/models_full.json (含建议和可选字段，供详情页/方法论)

字段选型依据: ../1-fetch/aa_data_extraction.md
"""

import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
INPUT = os.path.join(SCRIPT_DIR, 'cn_models_filtered.json')
OUTPUT_MIN = os.path.join(PROJECT_DIR, '4-final', 'models.json')
OUTPUT_FULL = os.path.join(PROJECT_DIR, '4-final', 'models_full.json')

# ============================================================
# 字段选型 — 对照 FIELD_MAPPING.md
# ============================================================

# 必须字段: 用于排行榜 / 计算器 / 详情页核心展示
KEEP_REQUIRED = [
    # 身份
    'model', 'company',             # 显示名 + 厂商
    # 智能层
    'scores.intelligence',          # 综合智能分 → 主排序维度
    'scores.coding',                # 代码能力 → 场景引擎
    'scores.agentic',               # Agent 能力 → 场景引擎
    'multilingual_zh',              # 中文评测 → 国内用户最直接的质量信号
    'benchmarks.omniscience',       # 幻觉率 → 智能层差异化
    # 性能层
    'speed.median_tps',             # 吞吐 → 速度维度
    'speed.ttft_seconds',           # 首 Token 延迟 → Chat 场景
    'speed.e2e_seconds',            # 端到端延迟 → 批量场景
    # 成本层
    'pricing.input',                # 输入价 → TCO 计算
    'pricing.output',               # 输出价 → TCO 计算
    'pricing.blended',              # 混合价 → 排名维度
    # 规格
    'meta.context_window',          # 上下文窗口
    'meta.size_class',              # 体积级别
    # 标记
    'meta.reasoning',               # 推理模型标记
    'meta.open_weights',            # 开源标记
    'meta.frontier',                # 前沿标记
    'meta.release_date',            # 版本预警
    # 多模态
    'modality.input_image',         # 图片输入支持
]

# 建议字段: 详情页展开 / 方法论页展示
KEEP_SUGGESTED = [
    'speed.speed_p95_tps',          # P95 吞吐 → 高负载真实体验
    'benchmarks.gpqa',              # 研究生级科学推理
    'benchmarks.hle',               # Humanity's Last Exam
    'benchmarks.mmlu_pro',          # 最经典语言理解 benchmark
    'url',                          # AA 详情页链接
    'meta.open_source_category',    # 开源分类（比 boolean 精确）
]

# 可选字段: 方法论页深度展示 / 未来功能预留
KEEP_OPTIONAL = [
    'benchmarks.mmmu_pro',          # 多模态理解
    'benchmarks.terminalbench_hard',# 终端能力
    'modality.input_audio',         # Phase 2 语音
    'modality.input_video',         # Phase 2 视频
    'modality.output_image',        # Phase 2 图片输出
]


def get_nested(d: dict, path: str):
    """从嵌套字典中按点号路径取值"""
    keys = path.split('.')
    val = d
    for k in keys:
        if isinstance(val, dict):
            val = val.get(k)
        else:
            return None
    return val


def set_nested(d: dict, path: str, value):
    """按点号路径设置嵌套字典值"""
    keys = path.split('.')
    for k in keys[:-1]:
        if k not in d:
            d[k] = {}
        d = d[k]
    d[keys[-1]] = value


def prune_model(model: dict, fields: list) -> dict:
    """保留指定字段，其余丢弃"""
    result = {}
    for path in fields:
        val = get_nested(model, path)
        if val is not None:
            set_nested(result, path, val)
    return result


def main():
    # ── 1. 读取 Step 1 输出 ──
    print(f'读取: {INPUT}')
    with open(INPUT, 'r', encoding='utf-8') as f:
        models = json.load(f)
    print(f'输入模型数: {len(models)}')

    # ── 2. 输出精简版 (排行榜 + 计算器) ──
    min_output = []
    for m in models:
        pruned = prune_model(m, KEEP_REQUIRED)
        # 保留 rank 和 url
        pruned['rank'] = m.get('rank')
        pruned['model'] = m.get('model', '')
        pruned['company'] = m.get('company', '')
        # 确保必有的顶层 key 存在
        for top_key in ['scores', 'speed', 'pricing', 'benchmarks', 'meta', 'modality']:
            if top_key not in pruned:
                pruned[top_key] = {}
        pruned['multilingual_zh'] = m.get('multilingual_zh')
        min_output.append(pruned)

    os.makedirs(os.path.dirname(OUTPUT_MIN), exist_ok=True)
    with open(OUTPUT_MIN, 'w', encoding='utf-8') as f:
        json.dump(min_output, f, indent=2, ensure_ascii=False)
    print(f'精简版: {OUTPUT_MIN} ({len(min_output)} 个模型, {len(KEEP_REQUIRED)} 个字段)')

    # ── 3. 输出完整版 (详情页 + 方法论) ──
    all_fields = KEEP_REQUIRED + KEEP_SUGGESTED + KEEP_OPTIONAL
    full_output = []
    for m in models:
        pruned = prune_model(m, all_fields)
        pruned['rank'] = m.get('rank')
        pruned['model'] = m.get('model', '')
        pruned['company'] = m.get('company', '')
        for top_key in ['scores', 'speed', 'pricing', 'benchmarks', 'meta', 'modality']:
            if top_key not in pruned:
                pruned[top_key] = {}
        pruned['multilingual_zh'] = m.get('multilingual_zh')
        pruned['url'] = m.get('url')
        full_output.append(pruned)

    with open(OUTPUT_FULL, 'w', encoding='utf-8') as f:
        json.dump(full_output, f, indent=2, ensure_ascii=False)
    print(f'完整版: {OUTPUT_FULL} ({len(full_output)} 个模型, {len(all_fields)} 个字段)')

    # ── 4. 检查字段效果 ──
    print(f'\n=== 字段填充率检查 (精简版第1个模型) ===')
    if min_output:
        def count_filled(obj, prefix=''):
            count = 0
            if isinstance(obj, dict):
                for k, v in obj.items():
                    path = f'{prefix}.{k}' if prefix else k
                    if v is not None and v != False and v != '':
                        count += 1
                        if isinstance(v, dict):
                            count += count_filled(v, path)
            return count

        first = min_output[0]
        print(f'  模型: {first["model"]}')
        filled = count_filled(first)
        print(f'  非空字段数: {filled}')

    # ── 5. 统计 (按 intelligence 降序) ──
    print(f'\n=== 最终模型清单 (按 intelligence 降序) ===')
    ranked = sorted(min_output, key=lambda x: x['scores'].get('intelligence') or 0, reverse=True)
    for i, m in enumerate(ranked, 1):
        intel = str(m['scores'].get('intelligence', '-')).rjust(5)
        speed = f"{m['speed'].get('median_tps', 0):.0f} t/s".rjust(7) if m['speed'].get('median_tps') else '-'.rjust(7)
        price = f"${m['pricing'].get('blended', 0)}".rjust(7) if m['pricing'].get('blended') else '-'.rjust(7)
        print(f"#{i:<3} {m['model']:<38} {intel} {speed} {price}")


if __name__ == '__main__':
    main()
