#!/usr/bin/env python3
"""
Fetch OpenRouter models + pricing.

Source:
  - /api/v1/models  → models with pricing (public API, stable)
  - /api/v1/datasets/rankings-daily → weekly token usage (requires API key, read-only)

Note: The old /api/frontend/models/find endpoint returned 404 permanently.
Analytics (weekly_tokens) now sourced from Datasets API instead of backfill.

Outputs:
  2-raw/or_models.json       → raw response (kept for debug)
  2-raw/or_models_full.json  → {models, analytics} for enrich_models.py
  2-raw/or_rankings.json     → empty (analytics unavailable)

Usage:
    python3 fetch_or_models.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from fetch_utils import fetch_json as _fetch_json, write_json, load_previous_raw

# 国内模型关键词单一来源: cn_classifier (曾三处重复维护导致 z ai/z.ai 式漂移)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "3-process"))
from cn_classifier import CN_MODEL_NAMES

API_URL = "https://openrouter.ai/api/v1/models"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "2-raw"
FULL_PATH = OUTPUT_DIR / "or_models_full.json"
RAW_PATH = OUTPUT_DIR / "or_models.json"


def fetch_json(url: str, timeout: int = 60, retries: int = 3) -> dict | None:
    """Fetch JSON with retry."""
    return _fetch_json(url, timeout=timeout, retries=retries)


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


def fetch_datasets_analytics(or_models: list[dict]) -> dict[str, dict]:
    """Fetch weekly token usage from OpenRouter Datasets API.

    GET /api/v1/datasets/rankings-daily — returns daily token counts per model.
    We aggregate the last 7 days into weekly totals.
    Requires OPENROUTER_API_KEY env var (read-only, no credit consumption).

    Returns: {model_name_lower: {total_prompt_tokens, total_completion_tokens, count}}
    """
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        print("  [DATASETS] OPENROUTER_API_KEY not set, skipping Datasets API")
        return {}

    # Date range: last 7 days
    end = datetime.utcnow().strftime("%Y-%m-%d")
    start = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
    url = f"https://openrouter.ai/api/v1/datasets/rankings-daily?start_date={start}&end_date={end}"

    print(f"\n[DATASETS] GET {url}")
    raw = _fetch_json(
        url,
        timeout=60,
        retries=3,
        headers={
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "llmcompare/1.0",
        },
    )
    if raw is None:
        print("  [DATASETS] ERROR: Failed to fetch after retries")
        return {}

    records = raw.get("data", [])
    print(f"  [DATASETS] {len(records)} daily records ({start} ~ {end})")

    if not records:
        return {}

    # Aggregate by model_permaslug → total_tokens
    slug_tokens: dict[str, int] = {}
    for rec in records:
        slug = rec.get("model_permaslug", "")
        tokens = int(rec.get("total_tokens", 0))
        if slug and tokens > 0:
            slug_tokens[slug] = slug_tokens.get(slug, 0) + tokens

    print(f"  [DATASETS] {len(slug_tokens)} unique models with token data")

    # Build name lookup: or model name → name (for matching)
    or_name_map = {}
    for m in or_models:
        name = m.get("name", "").strip()
        # Try permaslug and canonical_slug as keys
        for key in [m.get("permaslug", ""), m.get("canonical_slug", ""), m.get("id", ""), name]:
            if key:
                or_name_map[key.lower()] = name.lower()

    analytics: dict[str, dict] = {}
    matched = 0
    for slug, total_tokens in slug_tokens.items():
        # Match slug to OR model name
        name_lower = or_name_map.get(slug.lower())
        if not name_lower:
            # Try partial match: slug contains model id
            for or_key, or_name in or_name_map.items():
                if slug.lower() in or_key or or_key in slug.lower():
                    name_lower = or_name
                    break
        if not name_lower:
            continue

        # Split 50/50 as prompt/completion approximation (Datasets API only gives total)
        half = total_tokens // 2
        analytics[name_lower] = {
            "total_prompt_tokens": half,
            "total_completion_tokens": total_tokens - half,
            "count": 0,
        }
        matched += 1

    print(f"  [DATASETS] Matched {matched}/{len(slug_tokens)} models to OR names")
    return analytics


def main():
    print("=" * 60)
    print("Fetching OpenRouter models...")

    print(f"\n[1/1] GET {API_URL}")
    resp = fetch_json(API_URL, timeout=60, retries=3)
    if resp is None:
        print("ERROR fetching OpenRouter models after retries")
        cached = load_previous_raw(FULL_PATH.name, FULL_PATH.parent)
        if cached:
            print(f"[OK] 使用缓存 OpenRouter 数据（{FULL_PATH}）")
            write_json(FULL_PATH, cached)
            # exit 3 = 降级使用缓存，让管线感知 degraded 状态
            sys.exit(3)
        sys.exit(1)

    raw_models = resp.get("data", [])
    models = transform_models(raw_models)

    # Analytics: prefer Datasets API (real data), fall back to backfill from previous ranking
    analytics = fetch_datasets_analytics(models)
    datasets_failed = False
    if not analytics:
        datasets_failed = True
        print("  [DATASETS] No data from Datasets API, falling back to backfill")
        analytics = backfill_analytics_from_ranking(models)

    analytics_source = "Datasets API" if not datasets_failed else "backfill"
    print(f"  ✓ {len(models)} models (analytics: {len(analytics)} from {analytics_source})" if analytics else f"  ✓ {len(models)} models (analytics: 0 — no token data)")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Save raw response (for debug / future re-parsing)
    write_json(RAW_PATH, resp)
    print(f"  → {RAW_PATH}")

    # Build the file enrich_models.py reads: {"data": {"models": [...], "analytics": {}}}
    full_data = {
        "data": {
            "models": models,
            "analytics": analytics,
            "partial": datasets_failed,
        }
    }
    write_json(FULL_PATH, full_data)
    print(f"  → {FULL_PATH}")

    # or_rankings.json: empty (no analytics)
    rankings_path = OUTPUT_DIR / "or_rankings.json"
    write_json(rankings_path, [])
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

    # 权威表在 cn_classifier.CN_MODEL_NAMES; 以下 extras 为旧报告口径遗留
    # (仅影响本摘要打印, 与分类无关), 确认后并入 cn_classifier 即可删除
    cn_names = set(CN_MODEL_NAMES) | {"spark", "yi", "megrez", "ring", "hy"}
    cn_models = [
        m for m in models
        if any(c in (m.get("name", "") + m.get("id", "")).lower() for c in cn_names)
    ]
    print(f"CN models: {len(cn_models)}")
    print("Done ✓")


if __name__ == "__main__":
    main()
