#!/usr/bin/env python3
"""Compare today's and yesterday's ranking.json → changes.json."""

import json
import sys
from datetime import date, timedelta
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent
HISTORY = DATA / "5-history"
OUTPUT = DATA / "4-final" / "changes.json"
TODAY = date.today()


def load_ranking(day: date) -> list[dict] | None:
    path = HISTORY / f"{day.isoformat()}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def load_all_first_seen() -> dict[str, str]:
    """Scan all history snapshots to find the earliest date each model ID appeared."""
    first_seen: dict[str, str] = {}
    if not HISTORY.exists():
        return first_seen
    for f in sorted(HISTORY.glob("*.json")):
        date_str = f.stem  # e.g. "2026-06-20"
        try:
            models = json.loads(f.read_text())
            for m in models:
                mid = m["id"]
                if mid not in first_seen:
                    first_seen[mid] = date_str
        except Exception:
            continue
    return first_seen


def build_model_map(models: list[dict]) -> dict[str, dict]:
    """id → model dict"""
    return {m["id"]: m for m in models}


def calc_rankings(models: list[dict]) -> dict[str, int]:
    """id → 1-based rank by intelligence score (descending)"""
    scored = [(m["id"], m.get("scores", {}).get("intelligence") or 0) for m in models]
    scored.sort(key=lambda x: x[1], reverse=True)
    return {mid: i + 1 for i, (mid, _) in enumerate(scored)}


def pct_change(old: float, new: float) -> float | None:
    if old == 0:
        return None if new == 0 else 999
    return round((new - old) / abs(old) * 100, 1)


def build_changes(today_models: list[dict], yesterday_models: list[dict], first_seen_map: dict[str, str] | None = None, compare_date: date | None = None) -> dict:
    today_map = build_model_map(today_models)
    yesterday_map = build_model_map(yesterday_models)

    today_ids = set(today_map.keys())
    yesterday_ids = set(yesterday_map.keys())

    new_ids = today_ids - yesterday_ids
    dropped_ids = yesterday_ids - today_ids
    common_ids = today_ids & yesterday_ids

    today_ranks = calc_rankings(today_models)
    yesterday_ranks = calc_rankings(yesterday_models)

    changes = []

    # New models — with first_seen date from history
    for mid in sorted(new_ids, key=lambda x: today_ranks.get(x, 999)):
        m = today_map[mid]
        intel = m.get("scores", {}).get("intelligence")
        speed = m.get("speed", {}).get("median_tps") or 0
        price_in = m.get("pricing", {}).get("input")
        parts = []
        if intel:
            parts.append(f"智商 {intel:.0f}")
        if speed:
            parts.append(f"{speed:.0f} TPS")
        if price_in is not None:
            parts.append(f"${price_in}/M")
        first_seen = (first_seen_map or {}).get(mid, TODAY.isoformat())
        changes.append({
            "type": "new",
            "model": m["name"],
            "id": mid,
            "rank": today_ranks.get(mid),
            "first_seen": first_seen,
            # 结构化字段：前端按语言自行格式化 detail（detail 字段保留用于向后兼容）
            "intelligence": round(intel, 1) if intel else None,
            "tps": round(speed) if speed else None,
            "price_input": price_in,
            "detail": " · ".join(parts) if parts else "",
            "icon": "🆕",
        })

    # Dropped models
    for mid in sorted(dropped_ids, key=lambda x: yesterday_ranks.get(x, 999)):
        m = yesterday_map[mid]
        changes.append({
            "type": "dropped",
            "model": m["name"],
            "id": mid,
            "old_rank": yesterday_ranks.get(mid),
            "detail": "",
            "icon": "📉",
        })

    # Ranking changes (≥3 positions)
    for mid in common_ids:
        old_rank = yesterday_ranks.get(mid, 999)
        new_rank = today_ranks.get(mid, 999)
        diff = old_rank - new_rank  # positive = moved up
        if abs(diff) >= 3:
            m = today_map[mid]
            changes.append({
                "type": "ranking_up" if diff > 0 else "ranking_down",
                "model": m["name"],
                "id": mid,
                "old_rank": old_rank,
                "new_rank": new_rank,
                "change": diff,
                "detail": f"#{old_rank} → #{new_rank}",
                "icon": "🔺" if diff > 0 else "🔻",
            })

    # Price changes (>10%)
    for mid in common_ids:
        t = today_map[mid]
        y = yesterday_map[mid]
        for field, label in [("input", "输入"), ("output", "输出")]:
            t_price = (t.get("pricing") or {}).get(field)
            y_price = (y.get("pricing") or {}).get(field)
            if t_price is not None and y_price is not None and y_price > 0:
                pct = pct_change(y_price, t_price)
                if pct is not None and abs(pct) > 10:
                    changes.append({
                        "type": "price_drop" if pct < 0 else "price_up",
                        "model": t["name"],
                        "id": mid,
                        "field": field,
                        "old": y_price,
                        "new": t_price,
                        "change_pct": pct,
                        "detail": f"{label}价 ${y_price}→${t_price} ({pct:+.0f}%)",
                        "icon": "💰" if pct < 0 else "💸",
                    })

    # Intelligence score changes (>5 points)
    for mid in common_ids:
        t_intel = (today_map[mid].get("scores") or {}).get("intelligence")
        y_intel = (yesterday_map[mid].get("scores") or {}).get("intelligence")
        if t_intel is not None and y_intel is not None:
            diff = t_intel - y_intel
            if abs(diff) > 5:
                changes.append({
                    "type": "intel_change",
                    "model": today_map[mid]["name"],
                    "id": mid,
                    "old": round(y_intel, 1),
                    "new": round(t_intel, 1),
                    "change": round(diff, 1),
                    "detail": f"智商 {y_intel:.0f}→{t_intel:.0f} ({diff:+.1f})",
                    "icon": "🧠",
                })

    # Sort: new first, then by absolute impact
    type_order = {"new": 0, "dropped": 1, "ranking_up": 2, "ranking_down": 3,
                  "price_drop": 4, "price_up": 5, "intel_change": 6}
    changes.sort(key=lambda c: (type_order.get(c["type"], 99), -abs(c.get("change", 0))))

    summary = {
        "new_models": len(new_ids),
        "dropped_models": len(dropped_ids),
        "price_changes": sum(1 for c in changes if c["type"].startswith("price")),
        "ranking_changes": sum(1 for c in changes if c["type"].startswith("ranking")),
        "intel_changes": sum(1 for c in changes if c["type"] == "intel_change"),
    }

    return {
        "generated_at": date.today().isoformat(),
        "date": TODAY.isoformat(),
        # compare_with 必须反映实际使用的对比快照日期（可能是 2-7 天前），
        # 未显式传入时回退为昨天
        "compare_with": (compare_date or TODAY - timedelta(days=1)).isoformat(),
        "summary": summary,
        "changes": changes[:30],  # cap at 30
    }


def main():
    today_models = load_ranking(TODAY)
    if not today_models:
        print(f"[Changes] 无今日快照 ({TODAY})，跳过")
        return

    # Find the most recent previous snapshot
    yesterday = None
    for days_back in range(1, 8):
        candidate = TODAY - timedelta(days=days_back)
        if load_ranking(candidate) is not None:
            yesterday = candidate
            break

    if not yesterday:
        print("[Changes] 无历史快照可对比，跳过")
        return

    yesterday_models = load_ranking(yesterday)
    first_seen_map = load_all_first_seen()
    result = build_changes(today_models, yesterday_models, first_seen_map, compare_date=yesterday)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    s = result["summary"]
    print(f"[Changes] {result['date']} vs {result['compare_with']}: "
          f"新{s['new_models']} 下{s['dropped_models']} "
          f"价{s['price_changes']} 排{s['ranking_changes']} 智{s['intel_changes']}")
    print(f"[Changes] → {OUTPUT}")


if __name__ == "__main__":
    main()
