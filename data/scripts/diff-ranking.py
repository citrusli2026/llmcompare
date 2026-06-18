#!/usr/bin/env python3
"""对比两次 ranking.json，生成数据变化摘要。"""

import json
import sys
from pathlib import Path
from datetime import datetime


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
    prev = load_ranking(prev_path)
    curr = load_ranking(curr_path)
    
    prev_map = {m["id"]: m for m in prev}
    curr_map = {m["id"]: m for m in curr}
    
    prev_ids = set(prev_map)
    curr_ids = set(curr_map)
    
    # 1. 模型数量变化
    added = sorted(curr_ids - prev_ids)
    removed = sorted(prev_ids - curr_ids)
    common = sorted(curr_ids & prev_ids)
    
    result = {
        "timestamp": datetime.now().isoformat(timespec="minutes"),
        "prev_count": len(prev),
        "curr_count": len(curr),
        "added": [],
        "removed": [],
        "score_changes": [],
        "rank_changes": [],
        "arena_votes_changes": [],
        "completeness_changes": [],
        "flags_changes": [],
    }
    
    # 2. 新增/移除模型
    for mid in added:
        m = curr_map[mid]
        result["added"].append({
            "id": mid,
            "name": m.get("name", mid),
            "company": m.get("company", ""),
            "intelligence": m.get("scores", {}).get("intelligence"),
        })
    
    for mid in removed:
        m = prev_map[mid]
        result["removed"].append({
            "id": mid,
            "name": m.get("name", mid),
            "company": m.get("company", ""),
        })
    
    # 3. 分数变化
    for mid in common:
        p = prev_map[mid]
        c = curr_map[mid]
        p_intel = p.get("scores", {}).get("intelligence")
        c_intel = c.get("scores", {}).get("intelligence")
        if p_intel is not None and c_intel is not None and abs(c_intel - p_intel) >= 0.1:
            result["score_changes"].append({
                "id": mid,
                "name": c.get("name", mid),
                "old": p_intel,
                "new": c_intel,
                "delta": round(c_intel - p_intel, 1),
            })
    
    # 4. 排名变化（按 intelligence 排序）
    def rank_by_intel(models_map, ids):
        sorted_ids = sorted(ids, key=lambda x: models_map[x].get("scores", {}).get("intelligence") or 0, reverse=True)
        return {mid: i + 1 for i, mid in enumerate(sorted_ids)}
    
    prev_ranks = rank_by_intel(prev_map, common)
    curr_ranks = rank_by_intel(curr_map, common)
    
    for mid in common:
        p_rank = prev_ranks[mid]
        c_rank = curr_ranks[mid]
        if p_rank != c_rank:
            result["rank_changes"].append({
                "id": mid,
                "name": curr_map[mid].get("name", mid),
                "old_rank": p_rank,
                "new_rank": c_rank,
                "delta": p_rank - c_rank,  # 正数=上升
            })
    
    # 5. Arena votes 变化
    for mid in common:
        p_votes = prev_map[mid].get("arena_votes")
        c_votes = curr_map[mid].get("arena_votes")
        if p_votes != c_votes:
            result["arena_votes_changes"].append({
                "id": mid,
                "name": curr_map[mid].get("name", mid),
                "old": p_votes,
                "new": c_votes,
            })
    
    # 6. 完整度变化
    for mid in common:
        p_comp = prev_map[mid].get("data_completeness_pct", 0)
        c_comp = curr_map[mid].get("data_completeness_pct", 0)
        if abs(c_comp - p_comp) >= 0.5:
            result["completeness_changes"].append({
                "id": mid,
                "name": curr_map[mid].get("name", mid),
                "old": p_comp,
                "new": c_comp,
                "delta": round(c_comp - p_comp, 1),
            })
    
    # 7. flags 变化
    for mid in common:
        p_flags = prev_map[mid].get("flags", {})
        c_flags = curr_map[mid].get("flags", {})
        flag_changes = {}
        for key in set(p_flags) | set(c_flags):
            if p_flags.get(key) != c_flags.get(key):
                flag_changes[key] = {"old": p_flags.get(key), "new": c_flags.get(key)}
        if flag_changes:
            result["flags_changes"].append({
                "id": mid,
                "name": curr_map[mid].get("name", mid),
                "changes": flag_changes,
            })
    
    # 排序
    result["score_changes"].sort(key=lambda x: abs(x["delta"]), reverse=True)
    result["rank_changes"].sort(key=lambda x: abs(x["delta"]), reverse=True)
    result["arena_votes_changes"].sort(key=lambda x: (x["new"] or 0) - (x["old"] or 0), reverse=True)
    result["completeness_changes"].sort(key=lambda x: abs(x["delta"]), reverse=True)
    
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
            intel = format_number(m["intelligence"])
            lines.append(f"- **{m['name']}** ({m['company']}) — 智能分: {intel}")
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
        for m in diff["score_changes"][:10]:  # 最多显示10个
            icon = "🟢" if m["delta"] > 0 else "🔴" if m["delta"] < 0 else "⚪"
            lines.append(f"- {icon} **{m['name']}**: {m['old']:.1f} → {m['new']:.1f} ({m['delta']:+.1f})")
        if len(diff["score_changes"]) > 10:
            lines.append(f"- ... 还有 {len(diff['score_changes']) - 10} 个模型有变化")
        lines.append("")
    
    # 排名变化
    if diff["rank_changes"]:
        lines.append("### 🏆 排名变化")
        for m in diff["rank_changes"][:10]:
            icon = "⬆️" if m["delta"] > 0 else "⬇️"
            lines.append(f"- {icon} **{m['name']}**: 第{m['old_rank']}名 → 第{m['new_rank']}名")
        if len(diff["rank_changes"]) > 10:
            lines.append(f"- ... 还有 {len(diff['rank_changes']) - 10} 个模型有变化")
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
            icon = "🟢" if m["delta"] > 0 else "🔴"
            lines.append(f"- {icon} **{m['name']}**: {m['old']:.1f}% → {m['new']:.1f}% ({m['delta']:+.1f}%)")
        if len(diff["completeness_changes"]) > 10:
            lines.append(f"- ... 还有 {len(diff['completeness_changes']) - 10} 个模型有变化")
        lines.append("")
    
    # 无变化
    if not any([diff["added"], diff["removed"], diff["score_changes"], 
                diff["rank_changes"], diff["arena_votes_changes"], diff["completeness_changes"]]):
        lines.append("✅ 本次数据无显著变化")
        lines.append("")
    
    return "\n".join(lines)


def main():
    if len(sys.argv) < 3:
        # 自动查找最近两次提交的数据
        data_dir = Path(__file__).parent.parent / "4-final"
        ranking_path = data_dir / "ranking.json"
        
        # 尝试从 git 获取上次提交的 ranking.json
        import subprocess
        try:
            result = subprocess.run(
                ["git", "show", "HEAD~1:4-final/ranking.json"],
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
