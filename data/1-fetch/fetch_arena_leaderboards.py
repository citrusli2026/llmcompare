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
from datetime import datetime, timezone

from fetch_utils import fetch_json, write_json, load_previous_raw

BASE_URL = (
    "https://raw.githubusercontent.com/oolong-tea-2026/arena-ai-leaderboards"
    "/main/data"
)
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "2-raw"
OUTPUT_PATH = OUTPUT_DIR / "arena_leaderboards.json"
LEADERBOARDS = ["text", "code", "vision"]


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
            sys.exit(0)
        sys.exit(1)

    print(f"Latest snapshot date: {snapshot_date}")

    result = fetch_leaderboards(snapshot_date)
    total_models = result.get("total_models", 0)

    if total_models == 0:
        print("[ERROR] No leaderboard data fetched")
        cached = load_previous_raw(OUTPUT_PATH.name, OUTPUT_DIR)
        if cached:
            print(f"[OK] 使用缓存 Arena 数据（{OUTPUT_PATH}）")
            sys.exit(0)
        sys.exit(1)

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
        cn = [m for m in models if m.get("vendor", "").lower() in cn_vendors]
        if cn:
            print(f"\n  [{lb}] CN models ({len(cn)}):")
            for m in cn[:5]:
                print(f"    #{m['rank']:2d} {m['model']:<40s} {m['score']}")
            if len(cn) > 5:
                print(f"    ... and {len(cn) - 5} more")


if __name__ == "__main__":
    main()
