#!/usr/bin/env python3
"""Generate GitHub Actions step summary from ranking-meta.json and changes.json."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

APP_DATA = Path(__file__).resolve().parent.parent.parent / "app" / "src" / "data"


def load_json(filename):
    path = APP_DATA / filename
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def main():
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        print("GITHUB_STEP_SUMMARY not set", file=sys.stderr)
        return

    lines = []
    lines.append("## 📊 Data Refresh Report")
    lines.append("")
    lines.append(f"- **Time:** {datetime.now(timezone.utc).isoformat()}")

    meta = load_json("ranking-meta.json")
    if meta:
        lines.append("")
        lines.append("### 数据源健康度")
        stats = meta.get("stats", {})
        lines.append(f"- **模型总数:** {stats.get('total_models', '-')}")
        lines.append(f"- **数据完整:** {stats.get('data_complete', '-')}")
        lines.append(f"- **Frontier:** {stats.get('frontier', '-')}")
        lines.append(f"- **开源权重:** {stats.get('open_weights', '-')}")
        lines.append(f"- **部分更新:** {'是' if meta.get('partial_update') else '否'}")
        lines.append("")
        lines.append("| 数据源 | 状态 | 覆盖率 |")
        lines.append("|---|---|---|")
        for name, info in meta.get("sources", {}).items():
            status = "✅" if info.get("ok") else "⚠️"
            if info.get("cached"):
                status += " (缓存)"
            cov = info.get("coverage")
            cov_str = f"{cov:.0%}" if cov is not None else "-"
            lines.append(f"| {name} | {status} | {cov_str} |")

    changes = load_json("changes.json")
    if changes:
        lines.append("")
        lines.append("### 今日变化")
        s = changes.get("summary", {})
        lines.append(f"- 🆕 新上榜: {s.get('new_models', 0)}")
        lines.append(f"- 📉 下榜: {s.get('dropped_models', 0)}")
        lines.append(f"- 💰 价格变动: {s.get('price_changes', 0)}")
        lines.append(f"- 🏆 排名变动: {s.get('ranking_changes', 0)}")
        lines.append(f"- 🧠 分数变动: {s.get('intel_changes', 0)}")

    with open(summary_path, "a", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
