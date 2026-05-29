#!/usr/bin/env python3
"""
LLMCompare 数据质量验证脚本

规则:
- data_complete 仅标记数据完整度，不做筛选条件
- data_complete = intelligence 是否存在（唯一标准）
- 新增 data_completeness_pct 字段：实际有值字段数 / 期待字段数
- 验证失败时 exit code != 0，阻止自动合并
"""

import json
import sys
import math
from datetime import datetime
from pathlib import Path
from collections import Counter

DATA_PATH = Path(__file__).parent.parent / "src" / "data" / "ranking.json"

# ── 阈值配置（基于历史数据，留出合理波动） ──
THRESHOLDS = {
    "total_models": (30, 55),   # 365天窗口，约 40-50 模型
    "data_complete": (30, 50),
    "frontier": (5, 15),
    "intl": (2, 6),
    "has_arena": (18, 40),
    "has_cn_price": (30, 50),
    "has_speed": (25, 45),
}

# 与上次数据对比的最大允许变化率
MAX_CHANGE_RATIO = 0.30

# ── 数据完整度计算配置 ──
# 定义哪些字段参与完整度计算，以及权重
COMPLETENESS_FIELDS = {
    # 核心字段（必须有）
    "scores.intelligence": 1.0,
    "scores.coding": 1.0,
    "scores.agentic": 1.0,
    # 速度数据
    "speed.median_tps": 1.0,
    "speed.ttft_seconds": 0.5,
    "speed.e2e_seconds": 0.5,
    # 定价
    "pricing.input": 1.0,
    "pricing.output": 1.0,
    # 元数据
    "meta.context_window": 0.5,
    "meta.parameters": 0.5,
    "meta.output_tokens": 0.5,
    "meta.release_date": 0.5,
    # 链接
    "url": 1.0,
    "vendor_links.homepage": 0.5,
    # OR 数据
    "openrouter_pricing": 0.5,
    "openrouter_weekly_tokens": 0.3,
    # Arena
    "arena_rankings": 1.0,
    # 国内定价
    "cn_pricing": 1.0,
}


def get_nested_value(obj, path):
    """安全获取嵌套字段值"""
    try:
        parts = path.split(".")
        val = obj
        for p in parts:
            val = val[p]
        return val
    except (KeyError, TypeError):
        return None


def compute_completeness(model):
    """
    计算单个模型的数据完整度
    返回: (百分比, 实际得分, 总分)
    """
    actual = 0.0
    total = 0.0
    filled_fields = []
    missing_fields = []

    for field, weight in COMPLETENESS_FIELDS.items():
        total += weight
        val = get_nested_value(model, field)
        # 判断是否有有效值
        has_value = False
        if val is not None:
            if isinstance(val, (int, float)):
                has_value = True  # 包括 0
            elif isinstance(val, str) and val.strip():
                has_value = True
            elif isinstance(val, dict) and len(val) > 0:
                has_value = True
            elif isinstance(val, list) and len(val) > 0:
                has_value = True

        if has_value:
            actual += weight
            filled_fields.append(field)
        else:
            missing_fields.append(field)

    pct = (actual / total * 100) if total > 0 else 0
    return pct, actual, total, filled_fields, missing_fields


def load_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_previous_data():
    """尝试读取 git HEAD~1 版本的 ranking.json 用于对比"""
    import subprocess

    try:
        result = subprocess.run(
            ["git", "show", "HEAD~1:app/src/data/ranking.json"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent.parent,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except Exception:
        pass
    return None


def check_required_fields(models):
    """所有模型必须有这些字段（首页要显示）"""
    issues = []
    required_top = ["id", "name", "company", "type", "logo", "scores", "flags"]
    for m in models:
        for field in required_top:
            if field not in m or m[field] is None:
                issues.append(f"{m.get('id', '???')}: missing top-level field '{field}'")
                break

        # scores 必须有 intelligence
        if "scores" in m and isinstance(m["scores"], dict):
            intel = m["scores"].get("intelligence")
            if intel is None:
                issues.append(f"{m.get('id', '???')}: missing scores.intelligence")
            elif not isinstance(intel, (int, float)):
                issues.append(f"{m.get('id', '???')}: scores.intelligence is not a number")
        else:
            issues.append(f"{m.get('id', '???')}: missing or invalid scores")

        # flags 必须包含所有必需字段
        if "flags" in m and isinstance(m["flags"], dict):
            required_flags = [
                "frontier",
                "open_weights",
                "reasoning",
                "image_input",
                "chinese_eval",
                "has_speed",
                "has_pricing",
                "data_complete",
            ]
            for f in required_flags:
                if f not in m["flags"]:
                    issues.append(f"{m.get('id', '???')}: missing flag '{f}'")
        else:
            issues.append(f"{m.get('id', '???')}: missing or invalid flags")

    return issues


def check_intelligence_range(models):
    """intelligence 必须在 0-100 之间"""
    issues = []
    for m in models:
        intel = m.get("scores", {}).get("intelligence")
        if intel is not None:
            if intel < 0 or intel > 100:
                issues.append(f"{m['id']}: intelligence={intel} out of [0, 100]")
    return issues


def check_type_valid(models):
    """type 必须是 开源/闭源"""
    issues = []
    for m in models:
        t = m.get("type")
        if t not in ("开源", "闭源"):
            issues.append(f"{m.get('id', '???')}: invalid type='{t}'")
    return issues


def check_duplicate_ids(models):
    """不能有重复 ID"""
    ids = [m["id"] for m in models if "id" in m]
    counter = Counter(ids)
    dups = {k: v for k, v in counter.items() if v > 1}
    if dups:
        return [f"duplicate IDs: {dups}"]
    return []


def check_date_valid(models):
    """release_date 不能是未来"""
    issues = []
    today = datetime.now().date()
    for m in models:
        rd = m.get("meta", {}).get("release_date")
        if rd:
            try:
                d = datetime.strptime(str(rd), "%Y-%m-%d").date()
                if d > today:
                    issues.append(f"{m['id']}: future release_date={rd}")
            except ValueError:
                issues.append(f"{m['id']}: invalid release_date format={rd}")
    return issues


def check_ranking_consistency(models):
    """
    排名页一致性检查（所有模型都参与排名，data_complete 仅标记）
    """
    issues = []
    warnings = []

    # frontier 模型 intelligence 应 >= 50
    for m in models:
        if m["flags"].get("frontier") and m["scores"]["intelligence"] < 50:
            issues.append(
                f"{m['id']}: frontier=true but intelligence={m['scores']['intelligence']:.1f} < 50"
            )

    # 国际模型不应有国内定价（改为警告，因为我们现在主动为国际模型添加人民币参考价）
    for m in models:
        if not m["flags"].get("chinese_eval") and m.get("cn_pricing"):
            warnings.append(f"{m['id']}: international model has cn_pricing (reference price)")

    return issues, warnings


def check_thresholds(models):
    """统计量阈值检查"""
    issues = []
    stats = {
        "total_models": len(models),
        "data_complete": sum(1 for m in models if m.get("flags", {}).get("data_complete")),
        "frontier": sum(1 for m in models if m.get("flags", {}).get("frontier")),
        "intl": sum(1 for m in models if not m.get("flags", {}).get("chinese_eval")),
        "has_arena": sum(1 for m in models if m.get("arena_rankings")),
        "has_cn_price": sum(1 for m in models if m.get("cn_pricing")),
        "has_speed": sum(
            1
            for m in models
            if m.get("speed")
            and m["speed"].get("median_tps")
            and m["speed"]["median_tps"] != 0
        ),
    }

    for key, val in stats.items():
        low, high = THRESHOLDS[key]
        if not (low <= val <= high):
            issues.append(f"{key}={val} out of threshold [{low}, {high}]")

    return issues, stats


def check_score_distribution(models):
    """分数分布合理性检查"""
    issues = []
    ints = [m["scores"]["intelligence"] for m in models if "scores" in m]
    if len(ints) < 2:
        return issues

    mean = sum(ints) / len(ints)
    std = math.sqrt(sum((x - mean) ** 2 for x in ints) / len(ints))

    # 检查异常值 (>3σ)
    outliers = [m["id"] for m in models if abs(m["scores"]["intelligence"] - mean) > 3 * std]
    if outliers:
        issues.append(f"intelligence outliers (>3σ): {outliers}")

    # 最大相邻差距不应超过 15（防止数据错误导致排名断层）
    ints_sorted = sorted(ints)
    max_gap = max(ints_sorted[i + 1] - ints_sorted[i] for i in range(len(ints_sorted) - 1))
    if max_gap > 15:
        issues.append(f"max intelligence gap={max_gap:.1f} > 15")

    return issues


def check_against_previous(current, previous):
    """与上次数据对比"""
    issues = []
    if previous is None:
        return issues

    # 模型数变化
    curr_count = len(current)
    prev_count = len(previous)
    if prev_count > 0:
        change = abs(curr_count - prev_count) / prev_count
        if change > MAX_CHANGE_RATIO:
            issues.append(
                f"model count changed {prev_count} -> {curr_count} ({change*100:.0f}%), threshold={MAX_CHANGE_RATIO*100:.0f}%"
            )

    # Top3 排名剧烈变化检查（所有模型参与）
    curr_sorted = sorted(
        current,
        key=lambda x: x["scores"]["intelligence"],
        reverse=True,
    )
    prev_sorted = sorted(
        previous,
        key=lambda x: x["scores"]["intelligence"],
        reverse=True,
    )

    if len(curr_sorted) >= 3 and len(prev_sorted) >= 3:
        curr_top3 = [m["id"] for m in curr_sorted[:3]]
        prev_top3 = [m["id"] for m in prev_sorted[:3]]
        # 允许 Top3 有 1 个不同（正常迭代），超过则告警
        diff = len(set(curr_top3) ^ set(prev_top3))
        if diff > 1:
            issues.append(f"Top3 changed too much: prev={prev_top3} curr={curr_top3}")

    return issues


def check_url_consistency(models):
    """
    url 字段检查：
    - data_complete=true 的模型建议有 url（仅告警，不阻断）
    - data_complete=false 的模型不检查 url
    """
    warnings = []
    for m in models:
        if m.get("flags", {}).get("data_complete"):
            url = m.get("url")
            if url is None or url == "":
                warnings.append(f"{m['id']}: data_complete=true but url is missing (warning only)")
    return warnings


def print_completeness_report(models):
    """打印数据完整度报告"""
    print("\n" + "=" * 50)
    print("数据完整度报告")
    print("=" * 50)

    total_pct_sum = 0
    for m in models:
        pct, actual, total, filled, missing = compute_completeness(m)
        total_pct_sum += pct
        status = "✓" if pct >= 80 else "△" if pct >= 60 else "✗"
        print(f"  {status} {m['id']}: {pct:.1f}% ({actual:.1f}/{total:.1f})")
        if missing and pct < 80:
            # 只显示关键缺失字段
            key_missing = [f for f in missing if COMPLETENESS_FIELDS.get(f, 0) >= 1.0]
            if key_missing:
                print(f"      缺失: {', '.join(key_missing)}")

    avg = total_pct_sum / len(models) if models else 0
    print(f"\n  平均完整度: {avg:.1f}%")
    print(f"  完整度字段数: {len(COMPLETENESS_FIELDS)}")
    print(f"  总分: {sum(COMPLETENESS_FIELDS.values())}")


def main():
    print("=" * 50)
    print("LLMCompare 数据质量验证")
    print("=" * 50)

    try:
        models = load_data()
    except Exception as e:
        print(f"✗ 无法加载 ranking.json: {e}")
        sys.exit(1)

    print(f"加载模型数: {len(models)}")
    print()

    all_issues = []
    all_warnings = []

    # 1. 全局字段检查（首页显示需要）
    print("[1/8] 全局字段完整性...")
    issues = check_required_fields(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 2. intelligence 范围
    print("[2/8] intelligence 范围 [0, 100]...")
    issues = check_intelligence_range(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 3. type 有效性
    print("[3/8] type 字段有效性...")
    issues = check_type_valid(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 4. 重复 ID
    print("[4/8] 重复 ID 检查...")
    issues = check_duplicate_ids(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 5. 日期有效性
    print("[5/8] 发布日期有效性...")
    issues = check_date_valid(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 6. 排名页一致性（所有模型）
    print("[6/8] 排名页一致性...")
    issues, consistency_warnings = check_ranking_consistency(models)
    all_issues.extend(issues)
    all_warnings.extend(consistency_warnings)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 7. 统计量阈值
    print("[7/8] 统计量阈值检查...")
    issues, stats = check_thresholds(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")
    for key, val in stats.items():
        low, high = THRESHOLDS[key]
        status = "✓" if low <= val <= high else "✗"
        print(f"    {status} {key}: {val} (阈值: {low}-{high})")

    # 8. 分数分布
    print("[8/8] 分数分布合理性...")
    issues = check_score_distribution(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 9. url 一致性（仅告警）
    print("[9/8] url 一致性检查...")
    warnings = check_url_consistency(models)
    all_warnings.extend(warnings)
    print(f"  {'✓' if not warnings else '△'} {len(warnings)} warnings")

    # 10. 与上次数据对比（如果有）
    print("[10/8] 与上次数据对比...")
    previous = load_previous_data()
    if previous:
        issues = check_against_previous(models, previous)
        all_issues.extend(issues)
        print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")
    else:
        print("  - 无历史数据，跳过对比")

    # 数据完整度报告
    print_completeness_report(models)

    # 汇总
    print()
    print("=" * 50)
    if all_warnings:
        print(f"△ 警告 ({len(all_warnings)} 个，不阻断):")
        for i, w in enumerate(all_warnings, 1):
            print(f"  {i}. {w}")

    if all_issues:
        print(f"✗ 验证失败，共 {len(all_issues)} 个问题:")
        for i, issue in enumerate(all_issues, 1):
            print(f"  {i}. {issue}")
        sys.exit(1)
    else:
        print("✓ 所有验证通过")
        sys.exit(0)


if __name__ == "__main__":
    main()
