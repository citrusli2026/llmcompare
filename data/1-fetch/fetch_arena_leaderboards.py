#!/usr/bin/env python3
"""
Fetch LMSYS Arena (arena.ai) leaderboard snapshots from the community mirror.

Uses oolong-tea-2026/arena-ai-leaderboards GitHub repo which provides
daily auto-updated JSON snapshots of Arena leaderboards.

Output: 2-raw/arena_leaderboards.json
  {
    "date": "2026-05-04",
    "fetched_at": "...",
    "leaderboards": {
      "text":   [{"rank":1,"model":"...","vendor":"...","score":1503,"ci":7,"votes":7615}, ...],
      "code":   [...],
      "vision": [...]
    }
  }

Usage:
    python3 fetch_arena_leaderboards.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from datetime import date, datetime, timezone

from fetch_utils import fetch_json, write_json, load_previous_raw

BASE_URL = (
    "https://raw.githubusercontent.com/oolong-tea-2026/arena-ai-leaderboards"
    "/main/data"
)
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "2-raw"
OUTPUT_PATH = OUTPUT_DIR / "arena_leaderboards.json"
LEADERBOARDS = ["text", "code", "vision"]

# 数据量骤降时降级用缓存的最长天数。超过该天数的缓存价值已低于新的
# （较小的）上游快照——2026-08 镜像长期只返回 ~90 条（Arena 官方缩减榜单），
# 相对缓存比例的降级守卫把缓存永久冻结在 2026-08-01，新鲜度校验最终硬失败。
MAX_CACHE_FALLBACK_DAYS = 7


def snapshot_age_days(snapshot: dict) -> int | None:
    """Return age in days of a snapshot's `date` field, None if unparseable."""
    try:
        snap_date = date.fromisoformat(str(snapshot.get("date", ""))[:10])
    except ValueError:
        return None
    return (datetime.now(timezone.utc).date() - snap_date).days


def get_latest_date() -> str | None:
    """Get the latest available snapshot date from the repo."""
    latest = fetch_json(f"{BASE_URL}/latest.json", timeout=90, retries=3)
    if latest and "date" in latest:
        return latest["date"]
    return None


def fetch_leaderboards(date: str) -> dict:
    """Fetch all leaderboard snapshots for the given date."""
    result = {
        "date": date,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "leaderboards": {},
        "partial": False,
    }

    total_models = 0
    failed_boards = []
    for lb in LEADERBOARDS:
        url = f"{BASE_URL}/{date}/{lb}.json"
        data = fetch_json(url, timeout=90, retries=3)
        if not data:
            failed_boards.append(lb)
            continue

        meta = data.get("meta", {})
        models = data.get("models", [])
        print(
            f"  [{lb:6s}] {meta.get('model_count', len(models))} models, "
            f"last updated {meta.get('last_updated', '?')}"
        )

        result["leaderboards"][lb] = models
        total_models += len(models)

    if failed_boards:
        result["partial"] = True
        result["failed_boards"] = failed_boards
        print(f"  [WARN] Arena 榜单获取不完整: {failed_boards}")

    result["total_models"] = total_models
    return result


def main():
    print("=" * 60)
    print("Fetching Arena Leaderboard snapshots...")

    snapshot_date = get_latest_date()
    if not snapshot_date:
        print("[ERROR] Could not determine latest snapshot date")
        # 尝试使用缓存
        cached = load_previous_raw(OUTPUT_PATH.name, OUTPUT_DIR)
        if cached:
            print(f"[OK] 使用缓存 Arena 数据（{OUTPUT_PATH}）")
            # exit 3 = 降级使用缓存，让管线感知 degraded 状态
            sys.exit(3)
        sys.exit(1)

    print(f"Latest snapshot date: {snapshot_date}")

    result = fetch_leaderboards(snapshot_date)
    total_models = result.get("total_models", 0)

    if total_models == 0:
        print("[ERROR] No leaderboard data fetched")
        cached = load_previous_raw(OUTPUT_PATH.name, OUTPUT_DIR)
        if cached:
            print(f"[OK] 使用缓存 Arena 数据（{OUTPUT_PATH}）")
            # exit 3 = 降级使用缓存，让管线感知 degraded 状态
            sys.exit(3)
        sys.exit(1)

    # Arena 镜像曾出现只返回各榜 Top 20 的 truncated 数据（total_models 从 ~160
    # 骤降到 60），导致覆盖率暴跌、管线验证失败。若新数据量明显少于缓存，
    # 降级使用更完整的缓存数据，并标记 degraded——但仅以缓存仍新鲜为限：
    # 若上游长期缩减（而非临时故障），降级守卫会把缓存永久冻结，最终触发
    # 新鲜度校验硬失败（2026-08-12 实际发生）。缓存过老时接受新快照。
    cached = load_previous_raw(OUTPUT_PATH.name, OUTPUT_DIR)
    cached_total = cached.get("total_models", 0) if cached else 0
    if cached_total > 0 and total_models < cached_total * 0.6:
        cache_age = snapshot_age_days(cached)
        if cache_age is not None and cache_age <= MAX_CACHE_FALLBACK_DAYS:
            print(
                f"[WARN] Arena 数据量异常减少: 新数据 {total_models} 条，"
                f"缓存 {cached_total} 条。降级使用缓存。"
            )
            cached["partial"] = True
            cached["fallback_reason"] = f"new snapshot too small ({total_models} < 60% of {cached_total})"
            write_json(OUTPUT_PATH, cached)
            # exit 3 = 降级使用缓存，让管线感知 degraded 状态
            sys.exit(3)
        print(
            f"[WARN] Arena 新数据量低于缓存 ({total_models} < 60% of {cached_total})，"
            f"但缓存快照已 {cache_age if cache_age is not None else '?'} 天"
            f"（上限 {MAX_CACHE_FALLBACK_DAYS} 天），接受较小的上游快照以防缓存冻结"
        )

    write_json(OUTPUT_PATH, result)
    print(f"\n[OK] Saved {total_models} total entries to {OUTPUT_PATH}")

    # Print CN model summary
    cn_vendors = {
        "baidu", "alibaba", "tencent", "deepseek", "moonshot",
        "z.ai", "z ai", "xiaomi", "minimax", "stepfun",
        "bytedance", "kwai", "kuaishou", "inclusionai", "longcat",
        "01.ai", "01ai",
    }
    for lb in LEADERBOARDS:
        models = result["leaderboards"].get(lb, [])
        cn = [m for m in models if (m.get("vendor") or "").lower() in cn_vendors]
        if cn:
            print(f"\n  [{lb}] CN models ({len(cn)}):")
            for m in cn[:5]:
                print(f"    #{m['rank']:2d} {m['model']:<40s} {m['score']}")
            if len(cn) > 5:
                print(f"    ... and {len(cn) - 5} more")


if __name__ == "__main__":
    main()
