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
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

BASE_URL = (
    "https://raw.githubusercontent.com/oolong-tea-2026/arena-ai-leaderboards"
    "/main/data"
)
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "2-raw"
LEADERBOARDS = ["text", "code", "vision"]


def fetch_json(url: str) -> dict | None:
    """Fetch JSON from URL, return None on failure."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=90) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  [WARN] Failed to fetch {url}: {e}")
        return None


def get_latest_date() -> str | None:
    """Get the latest available snapshot date from the repo."""
    latest = fetch_json(f"{BASE_URL}/latest.json")
    if latest and "date" in latest:
        return latest["date"]
    return None


def main():
    print("=" * 60)
    print("Fetching Arena Leaderboard snapshots...")

    date = get_latest_date()
    if not date:
        print("[ERROR] Could not determine latest snapshot date")
        sys.exit(1)
    print(f"Latest snapshot date: {date}")

    result = {
        "date": date,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "leaderboards": {},
    }

    total_models = 0
    for lb in LEADERBOARDS:
        url = f"{BASE_URL}/{date}/{lb}.json"
        data = fetch_json(url)
        if not data:
            continue

        meta = data.get("meta", {})
        models = data.get("models", [])
        print(
            f"  [{lb:6s}] {meta.get('model_count', len(models))} models, "
            f"last updated {meta.get('last_updated', '?')}"
        )

        result["leaderboards"][lb] = models
        total_models += len(models)

    if total_models == 0:
        print("[ERROR] No leaderboard data fetched")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "arena_leaderboards.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\n[OK] Saved {total_models} total entries to {output_path}")

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
