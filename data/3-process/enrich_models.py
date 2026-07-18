#!/usr/bin/env python3
"""
管线 Step 3: 用 model_reference.json 给 ranking_all.json 注入厂商链接 + 国内官价，
合并 OpenRouter / Arena 数据，并按发布时间筛选，输出全量 + 活跃两份排名。

放在 build_frontend_models.py 之后运行。
参考数据在 data/0-refer/model_reference.json，管线重跑不会覆盖。

输出：
    ranking_all.json  — 全量排名（所有模型，原地更新）
    ranking.json      — 活跃排名（仅最近 180 天内发布的模型）

用法：
    python3 enrich_models.py [max_age_days]
    # 默认 max_age_days = 180
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cn_classifier import is_cn_company as _is_cn_company
from text_utils import clean_name

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent  # data/
DEFAULT_MAX_AGE_DAYS = 180


def _load_validation_config() -> dict:
    """加载共享验证配置，失败时返回最小默认配置。"""
    path = PROJECT_ROOT / "0-refer" / "validation_config.json"
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[WARN] 无法加载 {path}: {e}，使用默认配置")
        return {"completeness_fields": {}}


_VALIDATION_CONFIG = _load_validation_config()
# ── 数据完整度计算配置 ──
COMPLETENESS_FIELDS = _VALIDATION_CONFIG.get("completeness_fields", {})


def _get_nested_value(obj, path):
    """安全获取嵌套字段值"""
    try:
        parts = path.split(".")
        val = obj
        for p in parts:
            val = val[p]
        return val
    except (KeyError, TypeError):
        return None


def _calculate_completeness(model: dict) -> float:
    """计算单个模型的数据完整度百分比"""
    actual = 0.0
    total = 0.0

    for field, weight in COMPLETENESS_FIELDS.items():
        total += weight
        val = _get_nested_value(model, field)
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

    return round(actual / total * 100, 1) if total > 0 else 0.0


def load_or_data(or_models_path: Path) -> tuple[dict[str, int], dict[str, dict]]:
    """Load OR models+analytics, return ({name: weekly_tokens}, {name: {prompt, completion}})."""
    if not or_models_path.exists():
        print(f"[WARN] OR models not found: {or_models_path}, skipping")
        return {}, {}
    with open(or_models_path) as f:
        data = json.load(f)

    models = data.get("data", {}).get("models", [])
    analytics = data.get("data", {}).get("analytics", {})

    # Build slug/permaslug -> name and name set lookups
    slug_to_name = {}
    all_or_names = set()
    for m in models:
        name = m["name"].lower().strip()
        slug_to_name[m["slug"]] = name
        permaslug = m.get("permaslug")
        if permaslug:
            slug_to_name[permaslug] = name
        all_or_names.add(name)

    # Extract token volumes from analytics (keys can be slugs OR names)
    token_map = {}
    for key, stats in analytics.items():
        # Try as slug first, then as name
        name = slug_to_name.get(key)
        if not name and key in all_or_names:
            name = key.lower().strip()
        if not name:
            continue
        total = stats.get("total_completion_tokens", 0) + stats.get("total_prompt_tokens", 0)
        if total > 0:
            # Keep the highest volume if multiple variants exist
            if name not in token_map or total > token_map[name]:
                token_map[name] = total

    # Extract pricing from models
    price_map = {}
    for m in models:
        name = m.get("name", "").lower().strip()
        pricing = m.get("pricing", {})
        if name and pricing:
            prompt = float(pricing.get("prompt", 0))
            completion = float(pricing.get("completion", 0))
            if prompt > 0 or completion > 0:
                price_map[name] = {
                    "prompt": round(prompt * 1e6, 2),
                    "completion": round(completion * 1e6, 2),
                }

    print(f"[OK] Loaded {len(token_map)} OR token volumes, {len(price_map)} OR prices")
    return token_map, price_map


def load_arena_data(arena_path: Path) -> tuple[dict[str, list[dict]], dict[str, int]]:
    """Load Arena leaderboard snapshots.
    Returns ({leaderboard: [model_entry, ...]}, {model_name: max_votes}).
    """
    if not arena_path.exists():
        print(f"[WARN] Arena data not found: {arena_path}, skipping")
        return {}, {}
    with open(arena_path) as f:
        data = json.load(f)
    result = {}
    votes_map = {}  # model_name -> max votes across all leaderboards
    for lb_name, models in data.get("leaderboards", {}).items():
        result[lb_name] = models
        # Collect votes for each model (take max across leaderboards)
        for m in models:
            name = m.get("model", "").lower().strip()
            votes = m.get("votes", 0)
            if name and votes:
                votes_map[name] = max(votes_map.get(name, 0), votes)
    print(f"[OK] Loaded Arena data: {', '.join(f'{k}({len(v)})' for k, v in result.items())}, {len(votes_map)} models with votes")
    return result, votes_map


def match_arena_entries(model_name: str, arena_models: list[dict], mapping: dict | None = None, variant_map: dict | None = None) -> dict | None:
    """Find the best Arena entry for a model. Returns entry with best (lowest) rank.

    Matching priority:
    1. Explicit mapping lookup (from arena_name_mapping.json)
    2. Variant aggregation: if model is a variant (e.g. "DeepSeek V4 Pro (High)"),
       lookup its parent ("DeepSeek V4 Pro (Max)") and use parent's mapping
    3. Exact match (case-insensitive)
    4. Normalized match (remove - and ., compare full string)
    5. Keyword match: last 2-3 significant words of Arena name must appear
       in the model name (prevents "glm 5" matching "glm 5 1")
    """
    name_lower = model_name.lower().strip()
    name_norm = name_lower.replace("-", " ").replace(".", " ")

    # 1. Check explicit mapping first
    if mapping and model_name in mapping:
        mapped_names = mapping[model_name]
        matches = []
        for entry in arena_models:
            arena_name = entry.get("model", "")
            if arena_name in mapped_names:
                matches.append(entry)
        if matches:
            return min(matches, key=lambda e: e.get("rank", 9999))

    # 2. Variant aggregation: check if this model is a variant of a mapped parent
    if variant_map and model_name in variant_map:
        parent_name = variant_map[model_name]
        # First try parent's explicit mapping
        if mapping and parent_name in mapping:
            mapped_names = mapping[parent_name]
            matches = []
            for entry in arena_models:
                arena_name = entry.get("model", "")
                if arena_name in mapped_names:
                    matches.append(entry)
            if matches:
                return min(matches, key=lambda e: e.get("rank", 9999))
        # Fallback: try matching parent by exact/normalized/keyword
        parent_entry = match_arena_entries(parent_name, arena_models, mapping, None)
        if parent_entry:
            return parent_entry

    matches = []
    for entry in arena_models:
        arena_name = entry.get("model", "").lower().strip()
        arena_norm = arena_name.replace("-", " ").replace(".", " ")

        # Direct match
        if name_lower == arena_name:
            matches.append(entry)
            continue
        # Normalized exact match
        if name_norm == arena_norm:
            matches.append(entry)
            continue
        # Keyword matching: last 2-3 significant words of Arena name
        # must appear as contiguous substring in model name.
        # This is stricter than bidirectional substring match.
        arena_words = [w for w in arena_norm.split() if len(w) > 1]
        if len(arena_words) >= 2:
            key2 = " ".join(arena_words[-2:])
            key3 = " ".join(arena_words[-3:]) if len(arena_words) >= 3 else ""
            if key2 in name_norm or (key3 and key3 in name_norm):
                matches.append(entry)
                continue

    if not matches:
        return None
    return min(matches, key=lambda e: e.get("rank", 9999))


def match_arena_votes(model_name: str, votes_map: dict[str, int], variant_map: dict[str, str] | None = None) -> int | None:
    """Match model name to Arena votes map. Returns votes or None.
    
    Uses bidirectional substring matching to handle variant suffixes.
    Also checks variant_map for explicit mappings.
    """
    name_lower = model_name.lower().strip()
    name_norm = name_lower.replace("-", " ").replace(".", " ")
    
    # Phase 0: variant map lookup
    if variant_map and model_name in variant_map:
        mapped_name = variant_map[model_name].lower().strip()
        if mapped_name in votes_map:
            return votes_map[mapped_name]
        # Try normalized match
        mapped_norm = mapped_name.replace("-", " ").replace(".", " ")
        for arena_name, votes in votes_map.items():
            arena_norm = arena_name.replace("-", " ").replace(".", " ")
            if mapped_norm == arena_norm:
                return votes
    
    # Phase 1: direct / normalized exact match
    if name_lower in votes_map:
        return votes_map[name_lower]
    for arena_name, votes in votes_map.items():
        arena_norm = arena_name.replace("-", " ").replace(".", " ")
        if name_norm == arena_norm:
            return votes
    
    # Phase 2: bidirectional substring match
    best_match = None
    best_len = 0
    for arena_name, votes in votes_map.items():
        arena_norm = arena_name.replace("-", " ").replace(".", " ")
        
        if name_norm in arena_norm and len(name_norm) > best_len:
            best_match = votes
            best_len = len(name_norm)
        elif arena_norm in name_norm and len(arena_norm) > best_len:
            best_match = votes
            best_len = len(arena_norm)
    
    return best_match


def match_or_value(model_name: str, data_map: dict) -> any:
    """Match model name to OR data map. Returns value or None."""
    name_lower = model_name.lower().strip()
    name_norm = name_lower.replace("-", " ").replace(".", " ")

    # Phase 1: direct / normalized exact match
    if name_lower in data_map:
        return data_map[name_lower]
    for or_name, value in data_map.items():
        or_clean = or_name.split(":")[-1].strip().lower()
        or_clean = or_clean.split(" (")[0].strip()
        or_norm = or_clean.replace("-", " ").replace(".", " ")
        if name_norm == or_norm:
            return value

    # Phase 2: substring match (OR name must be a subset of model name).
    # Prefer longest match to avoid base variant shadowing pro/max.
    best_match = None
    best_len = 0
    for or_name, value in data_map.items():
        or_clean = or_name.split(":")[-1].strip().lower()
        or_clean = or_clean.split(" (")[0].strip()
        or_norm = or_clean.replace("-", " ").replace(".", " ")

        matched = False
        if or_norm in name_norm:
            matched = True
        else:
            or_words = [w for w in or_norm.split() if len(w) > 1]
            if len(or_words) >= 2:
                key2 = " ".join(or_words[-2:])
                key3 = " ".join(or_words[-3:]) if len(or_words) >= 3 else ""
                if key2 in name_norm or (key3 and key3 in name_norm):
                    matched = True

        if matched and len(or_norm) > best_len:
            best_match = value
            best_len = len(or_norm)

    return best_match


# clean_name 从 text_utils 导入 (唯一来源)


def enrich(
    models: list,
    ref: dict,
    or_tokens: dict[str, int] | None = None,
    or_pricing: dict[str, dict] | None = None,
    arena_data: dict[str, list[dict]] | None = None,
    arena_votes: dict[str, int] | None = None,
) -> tuple[int, int, int]:
    """Inject vendor_links + cn_pricing + license + OR data + Arena data + Arena votes, then update flags."""
    vendor_links = ref.get("vendor_links", {})
    cn_pricing = ref.get("cn_pricing", {})
    license_map = {k: v for k, v in ref.get("license", {}).items() if not k.startswith("_")}
    company_license_defaults = ref.get("license", {}).get("_company_defaults", {})
    or_tokens = or_tokens or {}
    or_pricing = or_pricing or {}
    arena_data = arena_data or {}
    arena_votes = arena_votes or {}

    enriched = 0
    flag_updates = 0
    or_matched = 0
    arena_matched = {k: 0 for k in arena_data.keys()}
    intl_count = 0
    license_matched = 0

    for m in models:
        company = m["company"]
        name = m["name"]
        # 用厂商名判断国内/国际，不再依赖 chinese_eval flag
        # （chinese_eval 原意是"是否有中文评测数据"，但常被误用于判断模型归属）
        is_intl = not _is_cn_company(company)
        if is_intl:
            intl_count += 1

        # 只保留官方官网（homepage）与模型控制台（console）两种静态信息
        raw_links = vendor_links.get(company, {})
        m["vendor_links"] = {
            k: v for k, v in raw_links.items()
            if k in ("homepage", "console") and v
        }

        # Inject url from vendor_links homepage
        if not m.get("url") and m["vendor_links"].get("homepage"):
            m["url"] = m["vendor_links"]["homepage"]

        # Inject license — keyed by clean_name, only filled for open-weight models.
        # 如果按模型名未命中，再按厂商默认值兜底；闭源模型显示 "商业授权"。
        clean = clean_name(name)
        lic = license_map.get(clean)
        if not lic and m.get("flags", {}).get("open_weights"):
            lic = company_license_defaults.get(company)
        if lic:
            m["license"] = lic
            license_matched += 1
        else:
            m["license"] = None

        # 国外模型：用美元定价作为 display（保留原始美元价格）
        if is_intl:
            p_in = m["pricing"].get("input")
            p_out = m["pricing"].get("output")
            if p_in is not None or p_out is not None:
                m["pricing"]["display"] = f"${p_in or '?'}/${p_out or '?'} (USD/百万token)"
        else:
            # 国内模型：注入国内官价
            cp = cn_pricing.get(name)
            if cp:
                m["cn_pricing"] = {
                    "input": cp["input"],
                    "output": cp["output"],
                    "source": cp["source"],
                }
                currency = cp.get("currency", "¥")
                cond = f" ({cp['condition']})" if cp.get("condition") else ""
                estimate = " (估算)" if cp.get("aa_only") else ""
                m["pricing"]["display"] = f"{currency}{cp['input']}/{currency}{cp['output']}{cond}{estimate}"
                enriched += 1
            else:
                m["cn_pricing"] = None

        # Inject OR weekly tokens + pricing (国内外都尝试)
        tokens = match_or_value(name, or_tokens)
        m["openrouter_weekly_tokens"] = tokens
        if tokens is not None:
            or_matched += 1

        m["openrouter_pricing"] = match_or_value(name, or_pricing)

        # Inject Arena leaderboard data (国内外都尝试)
        m["arena_rankings"] = {}
        # Load explicit mapping if available
        arena_mapping = ref.get("arena_name_mapping", {})
        # Load variant aggregation map: variant -> parent model name
        variant_map = ref.get("arena_variant_map", {})
        for lb_name, lb_models in arena_data.items():
            entry = match_arena_entries(name, lb_models, arena_mapping, variant_map)
            if entry:
                m["arena_rankings"][lb_name] = {
                    "rank": entry["rank"],
                    "score": entry["score"],
                    "votes": entry.get("votes"),
                }
                arena_matched[lb_name] += 1

        # Inject Arena votes (popularity indicator, replaces OR weekly tokens)
        m["arena_votes"] = match_arena_votes(name, arena_votes, variant_map)

        # Calculate data completeness percentage
        m["data_completeness_pct"] = _calculate_completeness(m)

        # data_complete: 多维度标准
        # 五者齐全：intelligence + coding + agentic + speed(>0) + pricing
        intel = m["scores"].get("intelligence")
        coding = m["scores"].get("coding")
        agentic = m["scores"].get("agentic")
        speed = m.get("speed", {}).get("median_tps") if isinstance(m.get("speed"), dict) else None
        pricing = m.get("pricing", {}).get("input") if isinstance(m.get("pricing"), dict) else None
        new_data_complete = (
            intel is not None and
            coding is not None and
            agentic is not None and
            speed is not None and speed >= 0 and
            pricing is not None
        )

        if m["flags"]["data_complete"] != new_data_complete:
            flag_updates += 1

        m["flags"]["data_complete"] = new_data_complete

    if or_matched:
        print(f"[OK] Matched OR requests for {or_matched}/{len(models)} models")
    
    # Report Arena coverage
    total_models = len(models)
    for lb_name, count in arena_matched.items():
        coverage = count / total_models if total_models > 0 else 0
        print(f"[OK] Matched Arena {lb_name} for {count}/{total_models} models ({coverage:.1%})")
    
    if intl_count:
        print(f"[OK] Processed {intl_count} international models (skipped cn_pricing)")

    if license_map:
        print(f"[OK] Matched license for {license_matched}/{len(models)} models")

    return enriched, flag_updates, sum(arena_matched.values())


def filter_by_date(models: list, max_age_days: int, today: datetime):
    """Split models into active (recent) and stale (old)."""
    # 用 date 对象比较，避免 tz-aware/naive datetime 混用报错
    today_date = today.date() if isinstance(today, datetime) else today
    cutoff_date = today_date - timedelta(days=max_age_days)
    active = []
    stale = []

    for m in models:
        rd = m.get("meta", {}).get("release_date", "")
        if not rd:
            stale.append((m, "无发布日期"))
            continue
        try:
            release_date = datetime.strptime(rd, "%Y-%m-%d").date()
            if release_date >= cutoff_date:
                active.append(m)
            else:
                days_ago = (today_date - release_date).days
                stale.append((m, f"{rd} ({days_ago}天前)"))
        except ValueError:
            stale.append((m, f"日期格式异常: {rd}"))

    return active, stale


# ── 系列简化规则：同子组只保留智能分最高的版本 ──
# 格式: {系列名: {子组名: [模型名列表]}}
# Pro 和 Flash 属于不同子组，不互相合并
VARIANT_GROUPS = {
    'DeepSeek V4': {
        'Pro': ['DeepSeek V4 Pro'],
        'Flash': ['DeepSeek V4 Flash'],
    },
    'MiMo V2': {
        'Pro': ['MiMo-V2.5-Pro', 'MiMo-V2-Pro'],
        'Flash': ['MiMo-V2-Flash'],
    },
    'GLM': {
        '5.x': ['GLM-5.1', 'GLM-5'],
        '4.x': ['GLM-4.7'],
    },
    'MiniMax M2': {
        'M2': ['MiniMax-M2.7', 'MiniMax-M2.5', 'MiniMax-M2.1'],
    },
    'Qwen3.6': {
        '3.6': ['Qwen3.6 Max Preview', 'Qwen3.6 Plus'],
    },
    'DeepSeek V3.2': {
        'V3.2': ['DeepSeek V3.2', 'DeepSeek V3.2 Speciale'],
    },
}


def deduplicate_variants(active_models: list) -> list:
    """Remove variant models, keep only the highest-intelligence model per sub-group."""
    # Build lookup
    model_by_name = {m['name']: m for m in active_models}
    removed_names = set()

    for series_name, sub_groups in VARIANT_GROUPS.items():
        for sub_name, candidates in sub_groups.items():
            # Filter to models that actually exist in active list
            existing = [c for c in candidates if c in model_by_name]
            if len(existing) <= 1:
                continue

            # Sort by intelligence descending, keep the first
            existing.sort(
                key=lambda name: (model_by_name[name].get('scores', {}).get('intelligence') or 0),
                reverse=True
            )
            keep = existing[0]
            remove = existing[1:]
            removed_names.update(remove)

            print(f"     [DEDUP] {series_name}/{sub_name}: keep {keep}, remove {', '.join(remove)}")

    # Filter out removed models
    result = [m for m in active_models if m['name'] not in removed_names]
    return result


def save(path: Path, models: list):
    with open(path, "w") as f:
        json.dump(models, f, ensure_ascii=False, indent=2)


def main():
    max_age = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else DEFAULT_MAX_AGE_DAYS

    ref_path = PROJECT_ROOT / "0-refer" / "model_reference.json"
    ranking_path = PROJECT_ROOT / "4-final" / "ranking_all.json"
    active_path = PROJECT_ROOT / "4-final" / "ranking.json"

    for p in [ref_path, ranking_path]:
        if not p.exists():
            print(f"[ERROR] File not found: {p}")
            sys.exit(1)

    # Load
    with open(ref_path) as f:
        ref = json.load(f)
    with open(ranking_path) as f:
        models = json.load(f)

    # Load OR tokens + pricing (both come from or_models_full.json, identical to or_models.json's pricing)
    or_tokens, or_pricing = load_or_data(PROJECT_ROOT / "2-raw" / "or_models_full.json")

    # Load Arena leaderboard data
    arena_data, arena_votes = load_arena_data(PROJECT_ROOT / "2-raw" / "arena_leaderboards.json")

    # Load Arena name mapping
    arena_map_path = PROJECT_ROOT / "0-refer" / "arena_name_mapping.json"
    if arena_map_path.exists():
        with open(arena_map_path) as f:
            arena_name_mapping = json.load(f)
        ref["arena_name_mapping"] = arena_name_mapping
        print(f"[OK] Loaded {len(arena_name_mapping)} Arena name mappings")
    else:
        print(f"[WARN] Arena name mapping not found: {arena_map_path}")

    # Load Arena variant aggregation map
    variant_map_path = PROJECT_ROOT / "0-refer" / "arena_variant_map.json"
    if variant_map_path.exists():
        try:
            with open(variant_map_path) as f:
                variant_map = json.load(f)
            # Filter out _meta keys
            variant_map = {k: v for k, v in variant_map.items() if not k.startswith("_")}
            ref["arena_variant_map"] = variant_map
            print(f"[OK] Loaded {len(variant_map)} Arena variant mappings")
        except json.JSONDecodeError as e:
            print(f"[ERROR] Invalid JSON in {variant_map_path}: {e}")
            ref["arena_variant_map"] = {}
    else:
        print(f"[WARN] Arena variant map not found: {variant_map_path}")

    # Clean name on reference keys to align with build_frontend_models.py
    # (removes trailing parenthetical suffixes like (Max), (High), etc.)
    cn_pricing_clean: dict = {}
    cleaned_to_sources: dict[str, list[str]] = {}
    for orig_key, val in ref.get("cn_pricing", {}).items():
        cleaned = clean_name(orig_key)
        if cleaned in cn_pricing_clean:
            cleaned_to_sources.setdefault(cleaned, [orig_key]).append(orig_key)
        else:
            cleaned_to_sources.setdefault(cleaned, [orig_key])
        cn_pricing_clean[cleaned] = val
    for cleaned, sources in cleaned_to_sources.items():
        if len(sources) > 1:
            print(f"[WARN] cn_pricing collision: {sources} all clean to {cleaned!r}, last wins")
    # Replace with cleaned maps so enrich() sees aligned names
    ref["cn_pricing"] = cn_pricing_clean

    # Enrich + update flags (single pass)
    enriched_count, flag_updates, arena_total = enrich(models, ref, or_tokens, or_pricing, arena_data, arena_votes)

    # Save full
    save(ranking_path, models)
    print(f"[OK] Enriched {enriched_count}/{len(models)} models, updated {flag_updates} data_complete → ranking_all.json")

    # Date filter
    today = datetime.now(timezone(timedelta(hours=8)))  # CST, 与 build_report.py 对齐
    active, stale = filter_by_date(models, max_age, today)
    
    # Variant deduplication: keep only highest-intelligence per sub-group
    active = deduplicate_variants(active)
    
    save(active_path, active)
    print(f"[OK] Date filter (≤{max_age}天): {len(active)} active → ranking.json")

    if stale:
        print(f"     移除了 {len(stale)} 个旧模型:")
        for m, reason in stale:
            print(f"       ❌ {m['name']:35s} | {reason}")


if __name__ == "__main__":
    main()
