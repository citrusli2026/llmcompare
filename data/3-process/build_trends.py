#!/usr/bin/env python3
"""从 5-history/ 快照生成趋势数据 trends.json。

为每个模型记录近 30 天的关键指标走势：
  - intelligence（智能分）
  - blended（混合价格）
  - openrouter_weekly_tokens（周用量）
  - rank_by_intelligence（按智能分排名）

输出:
    4-final/trends.json
    同步到 ../app/src/data/trends.json
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import date, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent
HISTORY_DIR = DATA_DIR / "5-history"
OUTPUT_PATH = DATA_DIR / "4-final" / "trends.json"
APP_OUTPUT_PATH = DATA_DIR.parent / "app" / "src" / "data" / "trends.json"
MAX_DAYS = 30


def load_history() -> list[tuple[str, list[dict]]]:
    """加载最近 N 天的历史快照，返回 [(date_str, models), ...] 按日期升序。"""
    if not HISTORY_DIR.exists():
        return []

    cutoff = date.today() - timedelta(days=MAX_DAYS)
    snapshots = []
    for f in sorted(HISTORY_DIR.glob("*.json")):
        try:
            day = date.fromisoformat(f.stem)
            if day < cutoff:
                continue
            with open(f, "r", encoding="utf-8") as fh:
                models = json.load(fh)
            snapshots.append((f.stem, models))
        except Exception:
            continue
    return snapshots


def build_trends(snapshots: list[tuple[str, list[dict]]]) -> dict:
    """构建趋势数据。"""
    dates = [s[0] for s in snapshots]

    # 计算每日按 intelligence 排名
    daily_ranks: list[dict[str, int]] = []
    for _, models in snapshots:
        scored = sorted(
            [(m.get("id"), m.get("scores", {}).get("intelligence") or 0) for m in models],
            key=lambda x: x[1],
            reverse=True,
        )
        ranks = {mid: i + 1 for i, (mid, _) in enumerate(scored)}
        daily_ranks.append(ranks)

    # 聚合每个模型的时序：先按 (model, day) 索引，再与全局 dates 对齐。
    # 中途上架/下架的模型在缺失日期补 None，保证四条序列长度 == 全局 dates 长度
    model_meta: dict[str, dict] = {}
    model_daily: dict[str, dict[str, tuple]] = {}
    for idx, (day, models) in enumerate(snapshots):
        ranks = daily_ranks[idx]
        for m in models:
            mid = m.get("id")
            if not mid:
                continue
            if mid not in model_meta:
                model_meta[mid] = {
                    "id": mid,
                    "name": m.get("name", mid),
                    "company": m.get("company", ""),
                }
                model_daily[mid] = {}
            model_daily[mid][day] = (
                m.get("scores", {}).get("intelligence"),
                m.get("pricing", {}).get("blended"),
                m.get("openrouter_weekly_tokens"),
                ranks.get(mid),
            )

    model_trends: list[dict] = []
    for mid, meta in model_meta.items():
        daily = model_daily[mid]
        series = [daily.get(day, (None, None, None, None)) for day in dates]
        model_trends.append({
            **meta,
            "dates": dates,
            "intelligence": [s[0] for s in series],
            "blended": [s[1] for s in series],
            "tokens": [s[2] for s in series],
            "rank": [s[3] for s in series],
        })

    return {
        "generated_at": date.today().isoformat(),
        "max_days": MAX_DAYS,
        "dates": dates,
        "models": model_trends,
    }


def main():
    print("=" * 60)
    print("Building trends.json from history snapshots...")

    snapshots = load_history()
    if len(snapshots) < 2:
        print(f"[WARN] 历史快照不足 2 天 ({len(snapshots)} 天)，跳过趋势生成")
        sys.exit(0)

    print(f"  加载 {len(snapshots)} 天历史快照")
    trends = build_trends(snapshots)
    print(f"  生成 {len(trends['models'])} 个模型趋势")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        # minified: trends.json (~200K) 整包内联进 /models/[id] 路由 chunk,
        # 无缩进输出省 ~60% 传输 (纯机器消费, 无需可读性)
        json.dump(trends, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  → {OUTPUT_PATH}")

    # 同步到前端
    APP_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(OUTPUT_PATH, APP_OUTPUT_PATH)
    print(f"  → {APP_OUTPUT_PATH}")
    print("Done ✓")


if __name__ == "__main__":
    main()
