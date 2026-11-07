#!/usr/bin/env python3
"""
Fetch LMSYS Arena (arena.ai) leaderboard snapshots from the community mirror.

Uses oolong-tea-2026/arena-ai-leaderboards GitHub repo which provides
daily auto-updated JSON snapshots of Arena leaderboards.

The mirror is not always healthy: since 2026-10 it has been publishing
`_index.json` placeholders with an empty `leaderboards` map and no per-board
files. So we never trust `latest.json` alone:

  1. try the latest date, then walk back up to 7 days
  2. skip dates whose `_index.json` has no leaderboards (cheap probe, no 404 storm)
  3. use the newest complete snapshot we can actually read
  4. if nothing works, fall back to the cached raw file (exit 3 = degraded)

Output: 2-raw/arena_leaderboards.json
  {
    "date": "2026-05-04",
    "fetched_at": "...",
    "leaderboards": {
      "text":   [{"rank":1,"model":"...","vendor":"...","score":1503,"ci":7,"votes":7615}, ...],
      "code":   [...],
      "vision": [...]
    },
    "stale_days": 3,          # 快照距今几天（0 = 今天）
    "partial": false          # 是否有榜单抓取失败
  }

Usage:
    python3 fetch_arena_leaderboards.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from datetime import date, datetime, timedelta, timezone

from fetch_utils import fetch_json, write_json, load_previous_raw

# 国内厂商关键词单一来源: cn_classifier (曾三处重复维护导致 z ai/z.ai 式漂移)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "3-process"))
from cn_classifier import CN_COMPANIES

BASE_URL = (
    "https://raw.githubusercontent.com/oolong-tea-2026/arena-ai-leaderboards"
    "/main/data"
)
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "2-raw"
OUTPUT_PATH = OUTPUT_DIR / "arena_leaderboards.json"
LEADERBOARDS = ["text", "code", "vision"]

# 从 latest 开始最多回退几天找完整快照
LOOKBACK_DAYS = 7

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
    """Get the latest announced snapshot date from the repo."""
    latest = fetch_json(f"{BASE_URL}/latest.json", timeout=90, retries=3)
    if latest and "date" in latest:
        return str(latest["date"])[:10]
    return None


def candidates(latest: str | None) -> list[str]:
    """latest first, then previous LOOKBACK_DAYS days (deduped, newest first)."""
    today = datetime.now(timezone.utc).date()
    start = today
    if latest:
        try:
            start = date.fromisoformat(latest)
        except ValueError:
            pass
    out: list[str] = []
    for i in range(0, LOOKBACK_DAYS + 1):
        d = (start - timedelta(days=i)).isoformat()
        if d not in out:
            out.append(d)
    return out


def index_has_data(day: str) -> bool:
    """Cheap probe: does this day's _index.json advertise any leaderboard?"""
    idx = fetch_json(f"{BASE_URL}/{day}/_index.json", timeout=30, retries=1)
    if not idx:
        return False
    boards = idx.get("leaderboards")
    return isinstance(boards, dict) and len(boards) > 0


def fetch_leaderboards(day: str) -> dict:
    """Fetch all leaderboard snapshots for the given date."""
    result = {
        "date": day,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "leaderboards": {},
        "partial": False,
    }

    total_models = 0
    failed_boards = []
    for lb in LEADERBOARDS:
        url = f"{BASE_URL}/{day}/{lb}.json"
        data = fetch_json(url, timeout=90, retries=2)
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


def use_cache(reason: str, code: int) -> None:
    cached = load_previous_raw(OUTPUT_PATH.name, OUTPUT_DIR)
    if cached:
        print(f"[OK] 使用缓存 Arena 数据（{reason}）")
        # exit 3 = 降级使用缓存，让管线感知 degraded 状态
        sys.exit(3)
    print(f"[ERROR] {reason}，且没有可用缓存")
    sys.exit(code)


def main():
    print("=" * 60)
    print("Fetching Arena Leaderboard snapshots...")

    latest = get_latest_date()
    if latest:
        print(f"Latest announced snapshot date: {latest}")
    else:
        print("[WARN] latest.json 不可读，按今天往前找")

    picked: dict | None = None
    picked_day: str | None = None
    for day in candidates(latest):
        if not index_has_data(day):
            print(f"  [SKIP] {day}: 上游无榜单数据（空快照）")
            continue
        data = fetch_leaderboards(day)
        if data.get("total_models", 0) > 0:
            picked, picked_day = data, day
            break
        print(f"  [SKIP] {day}: 榜单文件不可读")

    if picked is None or picked_day is None:
        use_cache("上游没有可用快照（镜像自 2026-10 起持续为空）", 1)

    total_models = picked["total_models"]
    stale_days = (datetime.now(timezone.utc).date() - date.fromisoformat(picked_day)).days
    picked["stale_days"] = stale_days
    if stale_days > 0:
        print(f"  [WARN] 使用 {picked_day} 的快照（距今 {stale_days} 天）")

    # Arena 镜像曾出现只返回各榜 Top 20 的 truncated 数据（total_models 从 ~160
    # 骤降到 60），导致覆盖率暴跌、管线验证失败。若新数据量明显少于缓存，
    # 降级使用更完整的缓存数据，并标记 degraded——但仅以缓存仍新鲜为限。
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
            sys.exit(3)
        print(
            f"[WARN] Arena 新数据量低于缓存 ({total_models} < 60% of {cached_total})，"
            f"但缓存快照已 {cache_age if cache_age is not None else '?'} 天"
            f"（上限 {MAX_CACHE_FALLBACK_DAYS} 天），接受较小的上游快照以防缓存冻结"
        )

    write_json(OUTPUT_PATH, picked)
    print(f"\n[OK] Saved {total_models} total entries to {OUTPUT_PATH}")

    # Print CN model summary
    # 权威表在 cn_classifier.CN_COMPANIES; z.ai/01ai 为旧列表变体写法
    # (仅影响本摘要打印), 确认后并入 cn_classifier 即可删除
    cn_vendors = set(CN_COMPANIES) | {"z.ai", "01ai"}
    for lb in LEADERBOARDS:
        models = picked["leaderboards"].get(lb, [])
        cn = [m for m in models if (m.get("vendor") or "").lower() in cn_vendors]
        if cn:
            print(f"\n  [{lb}] CN models ({len(cn)}):")
            for m in cn[:5]:
                print(f"    #{m['rank']:2d} {m['model']:<40s} {m['score']}")
            if len(cn) > 5:
                print(f"    ... and {len(cn) - 5} more")


if __name__ == "__main__":
    main()
