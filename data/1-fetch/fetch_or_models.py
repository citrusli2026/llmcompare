#!/usr/bin/env python3
"""
Fetch OpenRouter models + pricing.

Source:
  - /api/v1/models  → models with pricing (public API, stable)

Note: The old /api/frontend/models/find endpoint returned 404 permanently.
Analytics (weekly_tokens) are no longer available from OR — replaced by Arena votes.

Outputs:
  2-raw/or_models.json       → raw response (kept for debug)
  2-raw/or_models_full.json  → {models, analytics} for enrich_models.py
  2-raw/or_rankings.json     → empty (analytics unavailable)

Usage:
    python3 fetch_or_models.py
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

API_URL = "https://openrouter.ai/api/v1/models"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "2-raw"


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0",
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def transform_models(raw_models: list[dict]) -> list[dict]:
    """Normalize /api/v1/models shape to what enrich_models.py expects.

    enrich_models.py reads: m["name"], m["pricing"]["prompt"], m["pricing"]["completion"]
    The public API already has these at top level.
    """
    out = []
    for m in raw_models:
        # Ensure name is present (enrich_models.py key for matching)
        m.setdefault("name", m.get("name", ""))
        m.setdefault("id", m.get("id", ""))
        m.setdefault("canonical_slug", m.get("canonical_slug", ""))
        # slug/permaslug for backward compat (not in public API, use id/canonical_slug)
        m.setdefault("slug", m.get("id", ""))
        m.setdefault("permaslug", m.get("canonical_slug", m.get("id", "")))
        out.append(m)
    return out


RANKING_PATH = Path(__file__).resolve().parent.parent / "4-final" / "ranking.json"
PREV_RANKING_PATH = Path("/tmp/ranking-with-tokens.json")


def backfill_analytics_from_ranking(or_models: list[dict]) -> dict[str, dict]:
    """Load weekly_tokens from previous ranking.json and convert to analytics format.

    enrich_models.py's load_or_data() reads analytics as:
      {key: {total_completion_tokens, total_prompt_tokens, count}}
    where key is matched to model name via slug_to_name or direct name lookup.

    We match old ranking names to OR model names via substring matching,
    then use the OR name (lowered) as the analytics key.
    """
    prev = None
    for path in [RANKING_PATH, PREV_RANKING_PATH]:
        if not path.exists():
            continue
        with open(path) as f:
            candidate = json.load(f)
        has_tokens = sum(1 for m in candidate if m.get("openrouter_weekly_tokens") is not None)
        if has_tokens > 0:
            prev = candidate
            print(f"  [BACKFILL] Using {path.name} ({has_tokens} models with tokens)")
            break

    if prev is None:
        print("  [BACKFILL] No ranking.json with weekly_tokens found, skipping")
        return {}

    # Build OR name lookup: lowered name → original OR name
    or_name_map = {m["name"].lower().strip(): m["name"] for m in or_models}

    analytics: dict[str, dict] = {}
    backfilled = 0
    for m in prev:
        tokens = m.get("openrouter_weekly_tokens")
        if tokens is None or tokens <= 0:
            continue
        old_name = m.get("name", "").lower().strip()
        if not old_name:
            continue

        # Try to find matching OR model name (old name is substring of OR name)
        or_name = or_name_map.get(old_name)
        if not or_name:
            # Try substring match: old_name ⊂ or_name
            for or_key, or_orig in or_name_map.items():
                if old_name in or_key:
                    or_name = or_orig
                    break
        if not or_name:
            continue  # No match, skip

        # enrich_models.py sums completion + prompt, we split 50/50 as approximation
        half = tokens // 2
        analytics[or_name.lower().strip()] = {
            "total_completion_tokens": half,
            "total_prompt_tokens": tokens - half,
            "count": 0,
        }
        backfilled += 1

    print(f"  [BACKFILL] Matched {backfilled}/{len(prev)} models to OR names")
    return analytics


def main():
    print("=" * 60)
    print("Fetching OpenRouter models...")

    print(f"\n[1/1] GET {API_URL}")
    try:
        resp = fetch_json(API_URL)
    except Exception as e:
        print(f"ERROR fetching: {e}")
        sys.exit(1)

    raw_models = resp.get("data", [])
    models = transform_models(raw_models)

    # Analytics no longer available from OR API.
    # Backfill from previous ranking.json to preserve weekly_tokens for hotness scene.
    analytics = backfill_analytics_from_ranking(models)

    print(f"  ✓ {len(models)} models (analytics: {len(analytics)} backfilled from previous ranking)")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Save raw response (for debug / future re-parsing)
    raw_path = OUTPUT_DIR / "or_models.json"
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(resp, f, indent=2, ensure_ascii=False)
    print(f"  → {raw_path}")

    # Build the file enrich_models.py reads: {"data": {"models": [...], "analytics": {}}}
    full_data = {"data": {"models": models, "analytics": analytics}}
    full_path = OUTPUT_DIR / "or_models_full.json"
    with open(full_path, "w", encoding="utf-8") as f:
        json.dump(full_data, f, indent=2, ensure_ascii=False)
    print(f"  → {full_path}")

    # or_rankings.json: empty (no analytics)
    rankings_path = OUTPUT_DIR / "or_rankings.json"
    with open(rankings_path, "w", encoding="utf-8") as f:
        json.dump([], f)
    print(f"  → {rankings_path} (empty — analytics unavailable)")

    # ── Summary ──
    print("\n" + "=" * 60)
    print(f"Total models: {len(models)}")

    # Pricing stats
    with_pricing = sum(
        1 for m in models
        if float((m.get("pricing") or {}).get("prompt", 0)) > 0
        or float((m.get("pricing") or {}).get("completion", 0)) > 0
    )
    print(f"With pricing: {with_pricing}")

    cn_names = {
        "deepseek", "qwen", "kimi", "glm", "minimax",
        "baichuan", "stepfun", "moonshot", "ernie", "doubao",
        "hunyuan", "spark", "yi", "mimo", "megrez", "ring", "ling", "hy",
    }
    cn_models = [
        m for m in models
        if any(c in (m.get("name", "") + m.get("id", "")).lower() for c in cn_names)
    ]
    print(f"CN models: {len(cn_models)}")
    print("Done ✓")


if __name__ == "__main__":
    main()
