#!/usr/bin/env python3
"""基于 changes.json 生成数据变化 Markdown 摘要，同时从 ranking.json 补充统计信息。

changes.json 由 3-process/build_changes.py 统一产出，是新增/下榜/排名/价格/分数变化的
唯一事实来源。本脚本读取它并生成 PR/通知可用的 Markdown 摘要。
"""

import json
import sys
from pathlib import Path
from datetime import datetime


DATA_DIR = Path(__file__).resolve().parent.parent
CHANGES_PATH = DATA_DIR / "4-final" / "changes.json"


def load_json(path: Path) -> dict | list | None:
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def load_ranking(path: str) -> list[dict]:
    with open(path) as f:
        return json.load(f)


def format_number(n) -> str:
    if n is None:
        return "null"
    if isinstance(n, int) and abs(n) > 1000:
        return f"{n:,}"
    if isinstance(n, float):
        return f"{n:.1f}"
    return str(n)


def diff_rankings(prev_path: str, curr_path: str) -> dict:
    """读取 changes.json 并补充 ranking 文件对比信息。"""
    prev = load_ranking(prev_path)
    curr = load_ranking(curr_path)
    prev_map = {m["id"]: m for m in prev}
    curr_map = {m["id"]: m for m in curr}
    common_ids = set(prev_map) & set(curr_map)

    result = {
        "timestamp": datetime.now().isoformat(timespec="minutes"),
        "prev_count": len(prev),
        "curr_count": len(curr),
        "added": [],
        "removed": [],
        "score_changes": [],
        "rank_changes": [],
        "price_changes": [],
        "arena_votes_changes": [],
        "completeness_changes": [],
        "flags_changes": [],
    }

    # 优先读取 build_changes.py 的结果
    changes_data = load_json(CHANGES_PATH)
    if changes_data:
        for c in changes_data.get("changes", []):
            ctype = c.get("type")
            if ctype == "new":
                result["added"].append({
                    "id": c.get("id"),
                    "name": c.get("model", c.get("id")),
                    "company": curr_map.get(c.get("id"), {}).get("company", ""),
                    "intelligence": c.get("detail"),
                    "first_seen": c.get("first_seen"),
                })
            elif ctype == "dropped":
                result["removed"].append({
                    "id": c.get("id"),
                    "name": c.get("model", c.get("id")),
                    "company": prev_map.get(c.get("id"), {}).get("company", ""),
                })
            elif ctype in ("ranking_up", "ranking_down"):
                result["rank_changes"].append({
                    "id": c.get("id"),
                    "name": c.get("model", c.get("id")),
                    "old_rank": c.get("old_rank"),
                    "new_rank": c.get("new_rank"),
                    "delta": c.get("change", 0),
                })
            elif ctype in ("price_drop", "price_up"):
                result["price_changes"].append({
                    "id": c.get("id"),
                    "name": c.get("model", c.get("id")),
                    "field": c.get("field", ""),
                    "old": c.get("old"),
                    "new": c.get("new"),
                    "change_pct": c.get("change_pct", 0),
                })
            elif ctype == "intel_change":
                result["score_changes"].append({
                    "id": c.get("id"),
                    "name": c.get("model", c.get("id")),
                    "old": c.get("old"),
                    "new": c.get("new"),
                    "delta": c.get("change", 0),
                })

    # 从 ranking 文件补充： Arena 投票数变化、完整度变化、flags 变化
    for mid in common_ids:
        p = prev_map[mid]
        c = curr_map[mid]

        p_votes = p.get("arena_votes")
        c_votes = c.get("arena_votes")
        if p_votes != c_votes and (p_votes is not None or c_votes is not None):
            result["arena_votes_changes"].append({
                "id": mid,
                "name": c.get("name", mid),
                "old": p_votes,
                "new": c_votes,
            })

        p_comp = p.get("data_completeness_pct", 0)
        c_comp = c.get("data_completeness_pct", 0)
        if abs(c_comp - p_comp) >= 0.5:
            result["completeness_changes"].append({
                "id": mid,
                "name": c.get("name", mid),
                "old": p_comp,
                "new": c_comp,
                "delta": round(c_comp - p_comp, 1),
            })

        p_flags = p.get("flags", {})
        c_flags = c.get("flags", {})
        flag_changes = {}
        for key in set(p_flags) | set(c_flags):
            if p_flags.get(key) != c_flags.get(key):
                flag_changes[key] = {"old": p_flags.get(key), "new": c_flags.get(key)}
        if flag_changes:
            result["flags_changes"].append({
                "id": mid,
                "name": c.get("name", mid),
                "changes": flag_changes,
            })

    # 排序
    result["score_changes"].sort(key=lambda x: abs(x.get("delta", 0)), reverse=True)
    result["rank_changes"].sort(key=lambda x: abs(x.get("delta", 0)), reverse=True)
    result["price_changes"].sort(key=lambda x: abs(x.get("change_pct", 0)), reverse=True)
    result["arena_votes_changes"].sort(key=lambda x: (x["new"] or 0) - (x["old"] or 0), reverse=True)
    result["completeness_changes"].sort(key=lambda x: abs(x.get("delta", 0)), reverse=True)

    return result


def generate_markdown(diff: dict) -> str:
    lines = []
    lines.append(f"## LLMCompare 数据变化摘要 ({diff['timestamp']})")
    lines.append("")

    # 概览
    count_delta = diff["curr_count"] - diff["prev_count"]
    count_icon = "📈" if count_delta > 0 else "📉" if count_delta < 0 else "➡️"
    lines.append(f"**模型数量**: {diff['prev_count']} → {diff['curr_count']} ({count_icon} {count_delta:+d})")
    lines.append("")

    # 新增模型
    if diff["added"]:
        lines.append("### 🆕 新增模型")
        for m in diff["added"]:
            intel = format_number(m.get("intelligence"))
            first = m.get("first_seen")
            extra = f" (首次出现: {first})" if first else ""
            lines.append(f"- **{m['name']}** ({m['company']}) — {intel}{extra}")
        lines.append("")

    # 移除模型
    if diff["removed"]:
        lines.append("### 🗑️ 移除模型")
        for m in diff["removed"]:
            lines.append(f"- **{m['name']}** ({m['company']})")
        lines.append("")

    # 分数变化
    if diff["score_changes"]:
        lines.append("### 📊 智能分变化")
        for m in diff["score_changes"][:10]:
            icon = "🟢" if m.get("delta", 0) > 0 else "🔴" if m.get("delta", 0) < 0 else "⚪"
            lines.append(f"- {icon} **{m['name']}**: {m['old']:.1f} → {m['new']:.1f} ({m['delta']:+.1f})")
        if len(diff["score_changes"]) > 10:
            lines.append(f"- ... 还有 {len(diff['score_changes']) - 10} 个模型有变化")
        lines.append("")

    # 排名变化
    if diff["rank_changes"]:
        lines.append("### 🏆 排名变化")
        for m in diff["rank_changes"][:10]:
            icon = "⬆️" if m.get("delta", 0) > 0 else "⬇️"
            lines.append(f"- {icon} **{m['name']}**: 第{m['old_rank']}名 → 第{m['new_rank']}名")
        if len(diff["rank_changes"]) > 10:
            lines.append(f"- ... 还有 {len(diff['rank_changes']) - 10} 个模型有变化")
        lines.append("")

    # 价格变化
    if diff["price_changes"]:
        lines.append("### 💰 价格变化")
        for m in diff["price_changes"][:10]:
            icon = "🟢" if m.get("change_pct", 0) < 0 else "🔴"
            field = "输入" if m.get("field") == "input" else "输出" if m.get("field") == "output" else m.get("field", "价格")
            pct = m.get("change_pct", 0)
            lines.append(f"- {icon} **{m['name']}** {field}: ${m['old']:.2f} → ${m['new']:.2f} ({pct:+.0f}%)")
        if len(diff["price_changes"]) > 10:
            lines.append(f"- ... 还有 {len(diff['price_changes']) - 10} 个模型有变化")
        lines.append("")

    # Arena votes
    if diff["arena_votes_changes"]:
        lines.append("### 🗳️ Arena 投票数变化")
        for m in diff["arena_votes_changes"][:10]:
            old_v = format_number(m["old"])
            new_v = format_number(m["new"])
            lines.append(f"- **{m['name']}**: {old_v} → {new_v}")
        if len(diff["arena_votes_changes"]) > 10:
            lines.append(f"- ... 还有 {len(diff['arena_votes_changes']) - 10} 个模型有变化")
        lines.append("")

    # 完整度变化
    if diff["completeness_changes"]:
        lines.append("### 📈 数据完整度变化")
        for m in diff["completeness_changes"][:10]:
            icon = "🟢" if m.get("delta", 0) > 0 else "🔴"
            lines.append(f"- {icon} **{m['name']}**: {m['old']:.1f}% → {m['new']:.1f}% ({m['delta']:+.1f}%)")
        if len(diff["completeness_changes"]) > 10:
            lines.append(f"- ... 还有 {len(diff['completeness_changes']) - 10} 个模型有变化")
        lines.append("")

    # 无变化
    if not any([
        diff["added"], diff["removed"], diff["score_changes"],
        diff["rank_changes"], diff["price_changes"], diff["arena_votes_changes"], diff["completeness_changes"]
    ]):
        lines.append("✅ 本次数据无显著变化")
        lines.append("")

    return "\n".join(lines)


def main():
    if len(sys.argv) < 3:
        # 自动查找最近两次提交的数据
        # 4-final/ranking.json 不一定在 git 历史中（管线先写 4-final 再 cp 到 app/src/data 后提交）
        # 因此从历史提交中读取 app/src/data/ranking.json 作为昨日数据
        data_dir = Path(__file__).parent.parent / "4-final"
        ranking_path = data_dir / "ranking.json"

        import subprocess
        try:
            result = subprocess.run(
                ["git", "show", "HEAD~1:app/src/data/ranking.json"],
                capture_output=True, text=True, cwd=data_dir.parent
            )
            if result.returncode == 0:
                prev_path = "/tmp/ranking_prev_auto.json"
                with open(prev_path, "w") as f:
                    f.write(result.stdout)
                curr_path = str(ranking_path)
            else:
                print("无法获取上次数据，请提供两个文件路径", file=sys.stderr)
                sys.exit(1)
        except Exception:
            print("无法获取上次数据，请提供两个文件路径", file=sys.stderr)
            sys.exit(1)
    else:
        prev_path = sys.argv[1]
        curr_path = sys.argv[2]

    diff = diff_rankings(prev_path, curr_path)
    md = generate_markdown(diff)
    print(md)

    # 同时输出 JSON 供程序解析
    json_path = "/tmp/ranking-diff.json"
    with open(json_path, "w") as f:
        json.dump(diff, f, ensure_ascii=False, indent=2)
    print(f"\n[JSON 输出: {json_path}]", file=sys.stderr)


if __name__ == "__main__":
    main()
