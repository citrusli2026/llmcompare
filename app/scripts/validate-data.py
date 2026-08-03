#!/usr/bin/env python3
"""
LLMCompare 数据质量验证脚本

规则:
- data_complete 多维度标准: intelligence + coding + agentic + speed(>0) + pricing 五者齐全
- 由 enrich_models.py 在管线 Step 3 中覆盖设置
- data_completeness_pct 字段：实际有值字段数 / 期待字段数
- 验证失败时 exit code != 0，阻止自动合并
"""

import json
import sys
from datetime import datetime, date, timedelta
from pathlib import Path
from collections import Counter

DATA_PATH = Path(__file__).parent.parent / "src" / "data" / "ranking.json"
META_PATH = Path(__file__).parent.parent / "src" / "data" / "ranking-meta.json"
PROJECT_ROOT = Path(__file__).parent.parent.parent
HISTORY_DIR = PROJECT_ROOT / "data" / "5-history"
VALIDATION_CONFIG_PATH = PROJECT_ROOT / "data" / "0-refer" / "validation_config.json"


def load_validation_config() -> dict:
    """加载共享验证配置，失败时返回空配置（后续使用硬编码兜底）。"""
    try:
        with open(VALIDATION_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[WARN] 无法加载 {VALIDATION_CONFIG_PATH}: {e}，使用内置默认")
        return {}


VALIDATION_CONFIG = load_validation_config()

# ── Schema 校验 ──
SCHEMA_PATH = PROJECT_ROOT / "data" / "schema" / "ranking.schema.json"


def load_schema() -> dict | None:
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def validate_schema(models) -> list[str]:
    """使用 JSON Schema 校验 ranking.json，若 jsonschema 未安装则跳过。"""
    schema = load_schema()
    if schema is None:
        return []
    try:
        import jsonschema
        jsonschema.validate(instance=models, schema=schema)
        return []
    except ImportError:
        return []
    except jsonschema.ValidationError as e:
        return [f"Schema validation failed: {e.message} (path: {list(e.path)}))"]


# ── 阈值配置 ──
# 默认阈值（硬编码兜底），可被历史动态阈值覆盖
DEFAULT_THRESHOLDS = {
    "total_models": (15, 120),
    "data_complete": (20, 60),
    "frontier": (5, 55),
    "intl": (5, 40),
    "has_arena": (15, 35),
    "has_cn_price": (10, 30),
    "has_speed": (20, 55),
}

THRESHOLDS = {}
for key, (low, high) in DEFAULT_THRESHOLDS.items():
    cfg = VALIDATION_CONFIG.get("threshold_defaults", {}).get(key)
    if isinstance(cfg, (list, tuple)) and len(cfg) == 2:
        THRESHOLDS[key] = tuple(cfg)
    else:
        THRESHOLDS[key] = (low, high)

HISTORY_THRESHOLD_CFG = VALIDATION_CONFIG.get("history_based_thresholds", {})
HISTORY_THRESHOLDS_ENABLED = HISTORY_THRESHOLD_CFG.get("enabled", True)
HISTORY_LOOKBACK_DAYS = HISTORY_THRESHOLD_CFG.get("lookback_days", 7)
HISTORY_TOLERANCE = HISTORY_THRESHOLD_CFG.get("tolerance", 0.4)
HISTORY_MIN_LOWER = HISTORY_THRESHOLD_CFG.get("min_lower_bound", 5)

# 异常检测配置
ANOMALY_CFG = VALIDATION_CONFIG.get("anomaly_detection", {})

# 分数分布检查配置
SCORE_DIST_CFG = VALIDATION_CONFIG.get("score_distribution", {})
MODIFIED_Z_THRESHOLD = SCORE_DIST_CFG.get("modified_z_threshold", 3.5)
MAX_INTELLIGENCE_GAP = SCORE_DIST_CFG.get("max_gap", 15)

# ── 数据源新鲜度配置 ──
RAW_DIR = PROJECT_ROOT / "data" / "2-raw"
FRESHNESS_CFG = VALIDATION_CONFIG.get("source_freshness", {})
FRESHNESS_WARN_DAYS = FRESHNESS_CFG.get("warn_days", 3)
FRESHNESS_FAIL_DAYS = FRESHNESS_CFG.get("fail_days", 10)

# 与上次数据对比的最大允许变化率
MAX_CHANGE_RATIO = 0.50

# ── 数据完整度计算配置 ──
COMPLETENESS_FIELDS = VALIDATION_CONFIG.get("completeness_fields", {
    "scores.intelligence": 1.0,
    "scores.coding": 1.0,
    "scores.agentic": 1.0,
    "speed.median_tps": 1.0,
    "speed.ttft_seconds": 0.5,
    "speed.e2e_seconds": 0.5,
    "pricing.input": 1.0,
    "pricing.output": 1.0,
    "meta.context_window": 0.5,
    "meta.parameters": 0.5,
    "meta.knowledge_cutoff": 0.5,
    "meta.release_date": 0.5,
    "url": 1.0,
    "vendor_links.homepage": 0.5,
    "openrouter_pricing": 0.5,
    "openrouter_weekly_tokens": 0.3,
    "arena_rankings": 1.0,
    "cn_pricing": 1.0,
})


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


def load_history_stats() -> dict[str, list]:
    """加载最近 N 天的历史 ranking.json 快照，返回各指标的历史序列。"""
    stats_history: dict[str, list] = {
        "total_models": [],
        "data_complete": [],
        "frontier": [],
        "intl": [],
        "has_arena": [],
        "has_cn_price": [],
        "has_speed": [],
    }
    if not HISTORY_DIR.exists():
        return stats_history

    cutoff = date.today() - timedelta(days=HISTORY_LOOKBACK_DAYS)
    for f in sorted(HISTORY_DIR.glob("*.json")):
        try:
            day = date.fromisoformat(f.stem)
            if day < cutoff:
                continue
            with open(f, "r", encoding="utf-8") as fh:
                models = json.load(fh)
            stats_history["total_models"].append(len(models))
            stats_history["data_complete"].append(
                sum(1 for m in models if m.get("flags", {}).get("data_complete"))
            )
            stats_history["frontier"].append(
                sum(1 for m in models if m.get("flags", {}).get("frontier"))
            )
            stats_history["intl"].append(
                sum(1 for m in models if not m.get("flags", {}).get("chinese_eval"))
            )
            stats_history["has_arena"].append(
                sum(1 for m in models if m.get("arena_rankings"))
            )
            stats_history["has_cn_price"].append(
                sum(1 for m in models if m.get("cn_pricing"))
            )
            stats_history["has_speed"].append(
                sum(
                    1
                    for m in models
                    if m.get("speed")
                    and m["speed"].get("median_tps")
                    and m["speed"]["median_tps"] != 0
                )
            )
        except Exception:
            continue
    return stats_history


def compute_dynamic_thresholds() -> dict[str, tuple]:
    """基于历史数据计算动态阈值，历史不足时使用默认阈值。"""
    if not HISTORY_THRESHOLDS_ENABLED:
        return THRESHOLDS

    history = load_history_stats()
    dynamic = {}
    for key, (default_low, default_high) in THRESHOLDS.items():
        values = history.get(key, [])
        if len(values) >= 3:
            avg = sum(values) / len(values)
            # 允许在平均值上下 tolerance 范围内波动
            margin = max(avg * HISTORY_TOLERANCE, 3)  # 至少保留 3 的缓冲
            low = max(int(round(avg - margin)), HISTORY_MIN_LOWER)
            high = int(round(avg + margin))
            dynamic[key] = (low, high)
        else:
            dynamic[key] = (default_low, default_high)
    return dynamic


def check_source_health(models):
    """检查 ranking-meta.json 中的数据血缘元数据，评估各源健康度。"""
    issues = []
    warnings = []
    try:
        with open(META_PATH, "r", encoding="utf-8") as f:
            meta = json.load(f)
    except Exception:
        warnings.append("ranking-meta.json 数据血缘信息缺失或无法读取")
        return issues, warnings

    sources = meta.get("sources", {})
    for source_name, source_info in sources.items():
        coverage = source_info.get("coverage")
        if coverage is not None:
            # 覆盖率低于 30% 报错；30%-50% 只告警
            if coverage < 0.3:
                issues.append(f"{source_name} 覆盖率严重过低: {coverage:.0%}")
            elif coverage < 0.5:
                warnings.append(f"{source_name} 覆盖率偏低: {coverage:.0%}")
        if source_info.get("degraded"):
            warnings.append(f"{source_name} 抓取失败、已降级使用缓存数据（degraded=true），数据可能不是最新")
        if source_info.get("error"):
            warnings.append(f"{source_name} 抓取异常: {source_info['error']}")

    if meta.get("partial_update"):
        warnings.append("本次为部分更新（partial_update=true），部分数据源可能缺失")

    return issues, warnings


def _classify_freshness(source_label, age_days, issues, warnings):
    """按新鲜度阈值分级：超过 fail 报 issue，超过 warn 报 warning。"""
    if age_days > FRESHNESS_FAIL_DAYS:
        issues.append(f"{source_label} 数据严重过期: 快照距今 {age_days} 天 (fail 阈值 {FRESHNESS_FAIL_DAYS} 天)")
    elif age_days > FRESHNESS_WARN_DAYS:
        warnings.append(f"{source_label} 数据偏旧: 快照距今 {age_days} 天 (warn 阈值 {FRESHNESS_WARN_DAYS} 天)")


def check_source_freshness():
    """
    数据源新鲜度检查：
    - Arena：优先读 2-raw/arena_leaderboards.json 内容里的快照日期 `date` 字段
      （第三方镜像曾落后 14 天无人发现，文件 mtime 看不出内容过期）
    - AA / OpenRouter：用原始文件 mtime（CI 检出/重抓后 mtime 为当下不会误报，
      本地则反映上次抓取时间）
    超过 warn_days 报 warning，超过 fail_days 报 issue。
    """
    issues = []
    warnings = []
    today = date.today()

    arena_path = RAW_DIR / "arena_leaderboards.json"
    if arena_path.exists():
        snapshot_date = None
        try:
            with open(arena_path, "r", encoding="utf-8") as f:
                arena = json.load(f)
            raw_date = arena.get("date")
            if raw_date:
                snapshot_date = date.fromisoformat(str(raw_date)[:10])
        except Exception as e:
            warnings.append(f"Arena 快照日期无法解析: {e}")
        if snapshot_date is not None:
            age_days = (today - snapshot_date).days
        else:
            # 内容日期缺失时退化为 mtime
            age_days = (today - datetime.fromtimestamp(arena_path.stat().st_mtime).date()).days
        _classify_freshness("Arena", age_days, issues, warnings)
    else:
        warnings.append("Arena 原始数据缺失: 2-raw/arena_leaderboards.json")

    for label, filename in [("AA", "aa_all_full.json"), ("OpenRouter", "or_models_full.json")]:
        path = RAW_DIR / filename
        if not path.exists():
            warnings.append(f"{label} 原始数据缺失: 2-raw/{filename}")
            continue
        mtime_date = datetime.fromtimestamp(path.stat().st_mtime).date()
        _classify_freshness(label, (today - mtime_date).days, issues, warnings)

    return issues, warnings


def check_anomalies(current, previous):
    """检测异常数据变化。"""
    issues = []
    if previous is None:
        return issues

    max_price_drop = ANOMALY_CFG.get("max_price_drop_to_zero_count", 3)
    max_intel_change = ANOMALY_CFG.get("max_intelligence_day_change", 10)

    prev_map = {m["id"]: m for m in previous}
    curr_map = {m["id"]: m for m in current}

    # 价格突降为 0 的模型数
    price_drop_to_zero = 0
    for mid, c in curr_map.items():
        if mid not in prev_map:
            continue
        p_price = prev_map[mid].get("pricing", {}).get("blended")
        c_price = c.get("pricing", {}).get("blended")
        if p_price and p_price > 0 and c_price == 0:
            price_drop_to_zero += 1
    if price_drop_to_zero > max_price_drop:
        issues.append(f"价格突降为 0 的模型数: {price_drop_to_zero} > {max_price_drop}")

    # intelligence 单日剧变
    intel_jumps = []
    for mid, c in curr_map.items():
        if mid not in prev_map:
            continue
        p_intel = prev_map[mid].get("scores", {}).get("intelligence")
        c_intel = c.get("scores", {}).get("intelligence")
        if p_intel is not None and c_intel is not None:
            diff = abs(c_intel - p_intel)
            if diff > max_intel_change:
                intel_jumps.append(f"{mid}: {p_intel:.1f}→{c_intel:.1f}")
    if intel_jumps:
        # 只报前 5 个避免日志过长
        issues.append(f"intelligence 单日变化>{max_intel_change} 的模型: {', '.join(intel_jumps[:5])}")

    return issues


def check_required_fields(models):
    """所有模型必须有这些字段（首页要显示）"""
    issues = []
    required_top = ["id", "name", "company", "type", "logo", "scores", "flags"]
    for m in models:
        for field in required_top:
            if field not in m or m[field] is None:
                issues.append(f"{m.get('id', '???')}: missing top-level field '{field}'")
                break

        # scores 必须有 intelligence（仅 data_complete=true 的模型强制要求）
        if "scores" in m and isinstance(m["scores"], dict):
            intel = m["scores"].get("intelligence")
            if intel is None:
                dc = m.get("flags", {}).get("data_complete", False)
                if dc:
                    issues.append(f"{m.get('id', '???')}: data_complete=true but missing scores.intelligence")
                # data_complete=false 的模型 intelligence=null 可接受（新模型尚未评分）
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


LOGOS_DIR = Path(__file__).parent.parent / "public" / "logos"


def check_logo_files(models):
    """logo 引用的 /logos/*.svg 文件必须存在（缺失会导致浏览器控制台 404）"""
    issues = []
    if not LOGOS_DIR.exists():
        return issues
    checked = set()
    for m in models:
        logo = m.get("logo") or ""
        if not logo.startswith("/") or logo in checked:
            continue
        checked.add(logo)
        if not (LOGOS_DIR.parent / logo.lstrip("/")).exists():
            issues.append(
                f"{m.get('id', '???')}: logo 文件缺失 app/public{logo}"
                "（按现有模板补一个字母标 svg 即可消除 404）"
            )
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

    # frontier 模型 intelligence 应 >= 30
    for m in models:
        intel = m.get("scores", {}).get("intelligence")
        if m["flags"].get("frontier") and intel is not None and intel < 30:
            issues.append(
                f"{m['id']}: frontier=true but intelligence={intel:.1f} < 30"
            )

    # 国际模型不应有国内定价（改为警告，因为我们现在主动为国际模型添加人民币参考价）
    for m in models:
        if not m["flags"].get("chinese_eval") and m.get("cn_pricing"):
            warnings.append(f"{m['id']}: international model has cn_pricing (reference price)")

    return issues, warnings


def check_thresholds(models):
    """统计量阈值检查（优先使用基于历史数据的动态阈值）。"""
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

    dynamic_thresholds = compute_dynamic_thresholds()
    for key, val in stats.items():
        low, high = dynamic_thresholds[key]
        if not (low <= val <= high):
            issues.append(f"{key}={val} out of threshold [{low}, {high}]")

    return issues, stats, dynamic_thresholds


def check_score_distribution(models):
    """分数分布合理性检查"""
    issues = []
    ints = [
        m["scores"]["intelligence"]
        for m in models
        if "scores" in m and m["scores"].get("intelligence") is not None
    ]
    if len(ints) < 2:
        return issues

    sorted_ints = sorted(ints)
    n = len(sorted_ints)

    # 检查异常值 — 使用中位数 + MAD 的修正 z-score，
    # 而非 mean±3σ：后者会被真实存在的极低/极高分新模型（如 celeris-1，
    # AA 上游 intelligence≈11.8 的 legit 数据）误伤，导致每日管线卡死。
    # 修正 z-score 对合法极端值稳健，同时仍能识别数据损坏（如分数归 0）。
    # 阈值外置在 validation_config.json 的 score_distribution.modified_z_threshold，
    # 默认为 3.5；当前数据分布下合法低分模型处于临界，故配置为 4.5。
    # 跳过 intelligence=null 的模型
    median = sorted_ints[n // 2] if n % 2 else (sorted_ints[n // 2 - 1] + sorted_ints[n // 2]) / 2
    deviations = sorted(abs(x - median) for x in ints)
    mad = deviations[n // 2] if n % 2 else (deviations[n // 2 - 1] + deviations[n // 2]) / 2

    if mad > 0:
        outliers = [
            m["id"]
            for m in models
            if m.get("scores", {}).get("intelligence") is not None
            and abs(0.6745 * (m["scores"]["intelligence"] - median) / mad) > MODIFIED_Z_THRESHOLD
        ]
    else:
        # MAD=0（超过半数模型同分）：退化为绝对偏差检查
        outliers = [
            m["id"]
            for m in models
            if m.get("scores", {}).get("intelligence") is not None
            and abs(m["scores"]["intelligence"] - median) > MAX_INTELLIGENCE_GAP
        ]
    if outliers:
        issues.append(f"intelligence outliers (modified z > {MODIFIED_Z_THRESHOLD}): {outliers}")

    # 最大相邻差距不应超过阈值（防止数据错误导致排名断层）
    max_gap = max(sorted_ints[i + 1] - sorted_ints[i] for i in range(n - 1))
    if max_gap > MAX_INTELLIGENCE_GAP:
        issues.append(f"max intelligence gap={max_gap:.1f} > {MAX_INTELLIGENCE_GAP}")

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

    # Top3 排名剧烈变化检查（只看有 intelligence 分数的模型）
    curr_sorted = sorted(
        [m for m in current if m.get("scores", {}).get("intelligence") is not None],
        key=lambda x: x["scores"]["intelligence"],
        reverse=True,
    )
    prev_sorted = sorted(
        [m for m in previous if m.get("scores", {}).get("intelligence") is not None],
        key=lambda x: x["scores"]["intelligence"],
        reverse=True,
    )

    if len(curr_sorted) >= 3 and len(prev_sorted) >= 3:
        curr_top3 = [m["id"] for m in curr_sorted[:3]]
        prev_top3 = [m["id"] for m in prev_sorted[:3]]
        # 允许 Top3 有 2 个不同（模型迭代正常），超过则告警
        diff = len(set(curr_top3) ^ set(prev_top3))
        if diff > 2:
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


# 不应作为模型官网的域名/路径（开源站点、第三方聚合站等）
_UNOFFICIAL_HOME_PATTERNS = (
    "huggingface.co",
    "github.com",
    "huggingface.co/",
    "github.com/",
    "modelscope.cn",
    "gitee.com",
)


def check_vendor_links(models):
    """
    vendor_links 检查：
    - homepage 必须是厂商/模型官方自有站点，不能是开源仓库或第三方聚合站
    - 仅告警（不阻断），因为部分历史模型可能只有开源链接
    """
    warnings = []
    for m in models:
        homepage = m.get("vendor_links", {}).get("homepage", "")
        if not homepage:
            continue
        lower = homepage.lower()
        for pattern in _UNOFFICIAL_HOME_PATTERNS:
            if pattern in lower:
                warnings.append(
                    f"{m['id']}: homepage '{homepage}' looks like a community/aggregate site, not official"
                )
                break
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

    # 0. JSON Schema 校验
    print("[0/11] JSON Schema 校验...")
    issues = validate_schema(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 1. 全局字段检查（首页显示需要）
    print("[1/11] 全局字段完整性...")
    issues = check_required_fields(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 2. intelligence 范围
    print("[2/8] intelligence 范围 [0, 100]...")
    issues = check_intelligence_range(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 2b. logo 文件存在性
    print("[2b/11] logo 文件存在性...")
    issues = check_logo_files(models)
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
    print("[6/11] 排名页一致性...")
    issues, consistency_warnings = check_ranking_consistency(models)
    all_issues.extend(issues)
    all_warnings.extend(consistency_warnings)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 7. 统计量阈值（动态）
    print("[7/11] 统计量阈值检查...")
    issues, stats, dynamic_thresholds = check_thresholds(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")
    for key, val in stats.items():
        low, high = dynamic_thresholds[key]
        status = "✓" if low <= val <= high else "✗"
        source = "dynamic" if HISTORY_THRESHOLDS_ENABLED else "default"
        print(f"    {status} {key}: {val} (阈值: {low}-{high}, {source})")

    # 8. 分数分布
    print("[8/11] 分数分布合理性...")
    issues = check_score_distribution(models)
    all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

    # 9. url 一致性（仅告警）
    print("[9/11] url 一致性检查...")
    warnings = check_url_consistency(models)
    all_warnings.extend(warnings)
    print(f"  {'✓' if not warnings else '△'} {len(warnings)} warnings")

    # 9b. vendor_links 合规性（homepage 须为官方站点，仅告警）
    print("[9b/11] vendor_links 合规性检查...")
    warnings = check_vendor_links(models)
    all_warnings.extend(warnings)
    print(f"  {'✓' if not warnings else '△'} {len(warnings)} warnings")

    # 10. 与上次数据对比（如果有）
    print("[10/11] 与上次数据对比...")
    previous = load_previous_data()
    if previous:
        issues = check_against_previous(models, previous)
        all_issues.extend(issues)
        print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")
    else:
        print("  - 无历史数据，跳过对比")

    # 11. 数据源健康度 + 新鲜度 + 异常检测
    print("[11/11] 数据源健康度/新鲜度与异常检测...")
    issues, health_warnings = check_source_health(models)
    all_issues.extend(issues)
    all_warnings.extend(health_warnings)
    fresh_issues, fresh_warnings = check_source_freshness()
    all_issues.extend(fresh_issues)
    all_warnings.extend(fresh_warnings)
    if previous:
        issues = check_anomalies(models, previous)
        all_issues.extend(issues)
    print(f"  {'✓' if not issues else '✗'} {len(issues)} issues")

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
