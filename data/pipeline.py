#!/usr/bin/env python3
"""
LLMCompare 数据管线一键入口

用法: python3.11 pipeline.py [--skip-fetch] [--dry-run] [--cache-hours N]

功能：
  1. 分支准备（app/ 切日期分支，data/ 保持在 main）
  2. 数据抓取（可选，有缓存时跳过）
  3. 处理管线（build_frontend → enrich → report）
  4. data/ 本地提交 + diff 摘要
  5. 同步到前端（ranking.json + 日期文案）
  6. 验证（测试 + 构建 + lint + 数据质量）
  7. PR 创建
  8. 清理（切回 main）

退出码：0=成功，1=验证失败，2=管线中间步骤失败
"""

import subprocess
import sys
import os
import json
from datetime import date
from pathlib import Path

DRY_RUN = "--dry-run" in sys.argv
SKIP_FETCH = "--skip-fetch" in sys.argv

# --cache-hours N: 缓存新鲜度阈值 (默认 6h)，--cache-hours 0 强制重抓
CACHE_FRESH_HOURS = 6
for i, arg in enumerate(sys.argv):
    if arg == "--cache-hours" and i + 1 < len(sys.argv):
        CACHE_FRESH_HOURS = int(sys.argv[i + 1])

TODAY = date.today().strftime("%Y-%m-%d")
BRANCH = f"app-rank/{TODAY}"

BASE = Path(__file__).resolve().parent.parent
APP = BASE  # git 操作在整个仓库根做 (app/ 与 data/ 共用一个 git repo)
DATA = BASE / "data"

RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
CYAN = "\033[36m"
RESET = "\033[0m"


def step(name):
    print(f"\n{CYAN}=== {name} ==={RESET}")


def ok(msg):
    print(f"  {GREEN}✅ {msg}{RESET}")


def warn(msg):
    print(f"  {YELLOW}⚠️  {msg}{RESET}")


def fail(msg):
    print(f"  {RED}❌ {msg}{RESET}")


def run(cmd, cwd=None, exit_on_error=True):
    if DRY_RUN:
        print(f"  [DRY-RUN] {cmd}")
        return "", 0
    result = subprocess.run(cmd, shell=True, cwd=cwd or str(BASE),
                            capture_output=True, text=True, timeout=300)
    # 合并 stdout + stderr，确保构建/测试等命令的错误信息不会丢失
    combined = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0 and exit_on_error:
        fail(f"命令失败 (exit={result.returncode}): {cmd}")
        print(combined[-500:])
        sys.exit(2)
    return combined.strip(), result.returncode


def is_cache_fresh(path: Path, hours: int = CACHE_FRESH_HOURS) -> bool:
    """检查缓存是否在指定小时内"""
    if not path.exists():
        return False
    from time import time
    age_hours = (time() - path.stat().st_mtime) / 3600
    return age_hours < hours


# ── Start ──
print(f"{'='*60}")
print(f"  LLMCompare 数据管线 — {TODAY}")
print(f"  Mode: {'DRY RUN' if DRY_RUN else 'LIVE'}")
print(f"{'='*60}")

# 并发防护: 同一仓库同时跑两个 pipeline 会在 git checkout/push 上互相踩。
# flock 在进程退出/被杀时自动释放, 不会留下死锁。
import fcntl
import tempfile

_lock_path = Path(tempfile.gettempdir()) / "llmcompare-pipeline.lock"
_lock_file = open(_lock_path, "w")
try:
    fcntl.flock(_lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
except OSError:
    fail(f"另一个 pipeline 实例正在运行 ({_lock_path})，中止")
    sys.exit(2)
ok(f"已获取运行锁 {_lock_path}")

# ══════════════════════════════════════════════
# Phase 1: 分支准备
# ══════════════════════════════════════════════
step("Phase 1: 分支准备")

# app/ — 切到 main → 创建/复用日期分支
run("git checkout main && git pull origin main", cwd=str(APP))
branch_exists, rc = run(f"git show-ref --quiet refs/heads/{BRANCH}", cwd=str(APP), exit_on_error=False)
if rc != 0:
    run(f"git checkout -b {BRANCH}", cwd=str(APP))
    ok(f"创建分支 app/{BRANCH}")
else:
    # 复用分支: 先切分支再合并 main, merge 冲突必须中止而不是带冲突继续
    run(f"git checkout {BRANCH}", cwd=str(APP))
    merge_out, merge_rc = run("git merge main --no-edit", cwd=str(APP), exit_on_error=False)
    if merge_rc != 0:
        fail(f"合并 main 到 {BRANCH} 失败 (exit={merge_rc}), 可能存在冲突, 中止管线")
        print(merge_out[-500:])
        run("git checkout main", cwd=str(APP), exit_on_error=False)
        sys.exit(2)
    ok(f"复用分支 app/{BRANCH}")

# 验证分支切换（跳过 dry-run）
if not DRY_RUN:
    current_branch, _ = run("git branch --show-current", cwd=str(APP))
    if current_branch != BRANCH:
        fail(f"分支切换失败！当前在 {current_branch}，期望 {BRANCH}")
        sys.exit(2)

# data/ — 无需单独切分支，和 APP 共享同一个 git repo
# (Previously this ran "git checkout main" which UNDID the branch switch above!)

# ══════════════════════════════════════════════
# Phase 2: 数据抓取 + 处理管线
# ══════════════════════════════════════════════
step("Phase 2: 管线执行")

fetches = [
    ("AA",          "2-raw/aa_all_full.json",        "python3.11 1-fetch/fetch_aa_data.py --output 2-raw/"),
    ("OpenRouter",  "2-raw/or_models_full.json",     "python3.11 1-fetch/fetch_or_models.py"),
    ("Arena",       "2-raw/arena_leaderboards.json", "python3.11 1-fetch/fetch_arena_leaderboards.py"),
]

fetch_status = {"AA": {"ok": False, "cached": False, "degraded": False, "error": None},
                "OpenRouter": {"ok": False, "cached": False, "degraded": False, "error": None},
                "Arena": {"ok": False, "cached": False, "degraded": False, "error": None}}

if SKIP_FETCH:
    ok("--skip-fetch 标记, 跳过所有抓取")
else:
    for name, cache_rel, cmd in fetches:
        if is_cache_fresh(DATA / cache_rel):
            ok(f"{name} 缓存有效 ({CACHE_FRESH_HOURS}h内), 跳过抓取")
            fetch_status[name]["ok"] = True
            fetch_status[name]["cached"] = True
            continue

        warn(f"{name} 缓存过期, 执行抓取...")
        out, rc = run(cmd, cwd=str(DATA), exit_on_error=False)
        if rc == 0:
            ok(f"{name} 数据抓取完成")
            fetch_status[name]["ok"] = True
        elif rc == 3:
            # exit 3 = 抓取失败、脚本已降级使用缓存，继续管线但标记 degraded
            warn(f"{name} 抓取失败，已降级使用缓存数据 (degraded)")
            fetch_status[name]["cached"] = True
            fetch_status[name]["degraded"] = True
            fetch_status[name]["error"] = out[:500]
        else:
            fail(f"{name} 数据抓取失败 (exit={rc})")
            fetch_status[name]["error"] = out[:500]
            # 如果存在缓存文件，允许继续（降级模式）
            if (DATA / cache_rel).exists():
                warn(f"{name} 将使用缓存数据继续执行")
                fetch_status[name]["cached"] = True
                fetch_status[name]["degraded"] = True
            else:
                fail(f"{name} 无缓存可用，管线终止")
                sys.exit(2)

# Process pipeline
pipeline_step = 0
pipeline_scripts = [
    ("3-process", "python3.11 build_frontend_models.py"),
    ("3-process", "python3.11 enrich_models.py"),
    ("3-process", "python3.11 build_report.py"),
]

for subdir, script in pipeline_scripts:
    pipeline_step += 1
    print(f"  Step {pipeline_step}/{len(pipeline_scripts)}: {script.split()[-1]}")
    out, rc = run(script, cwd=str(DATA / subdir), exit_on_error=False)
    if rc != 0:
        fail(f"Step {pipeline_step} 失败: {script}")
        print(out[:300])
        print(out[-300:])
        sys.exit(2)
    ok(f"Step {pipeline_step} 完成")

# ══════════════════════════════════════════════
# Phase 3: 保存快照 + 生成变化摘要
# ══════════════════════════════════════════════
step("Phase 3: 保存快照并生成变化摘要")

# 原生 Python 读取模型数（替代 shell python3.11 -c，dry-run 下也能得到真实值）
def count_models(path: Path) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return str(len(json.load(f)))
    except Exception as e:
        warn(f"读取 {path} 失败: {e}")
        return "0"


import shutil
from datetime import timedelta

HISTORY_DIR = DATA / "5-history"
snapshot_path = HISTORY_DIR / f"{TODAY}.json"
src_count = count_models(DATA / "4-final" / "ranking.json")
if DRY_RUN:
    warn(f"DRY RUN: 跳过写入 5-history/{snapshot_path.name} 与 30 天快照清理")
else:
    HISTORY_DIR.mkdir(exist_ok=True)
    shutil.copy(DATA / "4-final" / "ranking.json", snapshot_path)
    ok(f"快照: {snapshot_path.name} ({src_count} 模型)")
    # 清理 30 天前的快照
    cutoff = date.today() - timedelta(days=30)
    for old in sorted(HISTORY_DIR.glob("*.json")):
        try:
            old_date = date.fromisoformat(old.stem)
            if old_date < cutoff:
                old.unlink()
        except ValueError:
            pass

# 生成变化对比 changes.json
print("  Step 1/3: build_changes.py")
out, rc = run("python3.11 3-process/build_changes.py", cwd=str(DATA), exit_on_error=False)
if rc == 0:
    ok("build_changes.py 完成")
else:
    warn(f"build_changes.py 跳过: {out[:200]}")

# 生成历史趋势 trends.json
print("  Step 2/3: build_trends.py")
out, rc = run("python3.11 3-process/build_trends.py", cwd=str(DATA), exit_on_error=False)
if rc == 0:
    ok("build_trends.py 完成")
else:
    warn(f"build_trends.py 跳过: {out[:200]}")

# diff 摘要（基于 changes.json + ranking 对比）
print("  Step 3/3: diff-ranking.py")
run("python3.11 scripts/diff-ranking.py > /tmp/data-diff.md", cwd=str(DATA), exit_on_error=False)
diff_content, _ = run("cat /tmp/data-diff.md", exit_on_error=False)
if diff_content:
    ok(f"变化摘要: {len(diff_content)} chars")

# ══════════════════════════════════════════════
# Phase 4: 同步到前端
# ══════════════════════════════════════════════
step("Phase 4: 同步到前端")

# ranking.json
run("cp 4-final/ranking.json ../app/src/data/ranking.json", cwd=str(DATA))

# 验证 cp
src_count = count_models(DATA / "4-final" / "ranking.json")
dst_count = count_models(APP / "app" / "src" / "data" / "ranking.json")
if src_count != dst_count:
    warn(f"cp 不完整! data/={src_count} app/={dst_count}，重试...")
    run("cp 4-final/ranking.json ../app/src/data/ranking.json", cwd=str(DATA))
    dst_count = count_models(APP / "app" / "src" / "data" / "ranking.json")
ok(f"ranking.json: {src_count} 模型 → app/({dst_count})")

# 注入数据血缘元数据到独立文件 ranking-meta.json
from datetime import datetime, timezone

def write_ranking_meta():
    ranking_path = APP / "app" / "src" / "data" / "ranking.json"
    meta_path = APP / "app" / "src" / "data" / "ranking-meta.json"
    try:
        with open(ranking_path, "r", encoding="utf-8") as f:
            ranking = json.load(f)
        n = len(ranking)
        meta = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "version": "1.0",
            "partial_update": any(
                not s["ok"] or s["cached"] or s.get("degraded", False)
                for s in fetch_status.values()
            ),
            "sources": {
                "artificial_analysis": {
                    "ok": fetch_status["AA"]["ok"],
                    "cached": fetch_status["AA"]["cached"],
                    "degraded": fetch_status["AA"].get("degraded", False),
                    "error": fetch_status["AA"]["error"],
                    "coverage": round(sum(1 for m in ranking if m.get("scores", {}).get("intelligence") is not None) / max(n, 1), 3),
                },
                "openrouter": {
                    "ok": fetch_status["OpenRouter"]["ok"],
                    "cached": fetch_status["OpenRouter"]["cached"],
                    "degraded": fetch_status["OpenRouter"].get("degraded", False),
                    "error": fetch_status["OpenRouter"]["error"],
                    "coverage": round(sum(1 for m in ranking if m.get("openrouter_weekly_tokens") is not None) / max(n, 1), 3),
                    "pricing_coverage": round(sum(1 for m in ranking if m.get("openrouter_pricing") is not None) / max(n, 1), 3),
                },
                "arena": {
                    "ok": fetch_status["Arena"]["ok"],
                    "cached": fetch_status["Arena"]["cached"],
                    "degraded": fetch_status["Arena"].get("degraded", False),
                    "error": fetch_status["Arena"]["error"],
                    "coverage": round(sum(1 for m in ranking if m.get("arena_rankings")) / max(n, 1), 3),
                },
            },
            "stats": {
                "total_models": n,
                "data_complete": sum(1 for m in ranking if m.get("flags", {}).get("data_complete")),
                "frontier": sum(1 for m in ranking if m.get("flags", {}).get("frontier")),
                "open_weights": sum(1 for m in ranking if m.get("flags", {}).get("open_weights")),
            },
        }
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)
        ok(f"ranking-meta.json 已写入数据血缘元数据")
    except Exception as e:
        warn(f"写入 ranking-meta.json 失败: {e}")

if DRY_RUN:
    warn("DRY RUN: 跳过 ranking-meta.json / metadata.json / changes / trends / 日期文案写入")
else:
    write_ranking_meta()

    # metadata.json — 写入更新时间戳，前端关于页读取
    metadata = {"updated_at": datetime.now(timezone.utc).isoformat()}
    metadata_path = APP / "app" / "src" / "data" / "metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2))
    ok(f"metadata.json: updated_at={metadata['updated_at']}")

    # 同步 changes.json / trends.json 到前端
    for filename in ["changes.json", "trends.json"]:
        src = DATA / "4-final" / filename
        dst = APP / "app" / "src" / "data" / filename
        if src.exists():
            shutil.copy(src, dst)
            ok(f"{filename} 已同步到前端")

# 日期文案 - 使用 JSON 操作避免正则误匹配
def update_i18n_dates():
    today_cn = f"{date.today().year}年{date.today().month}月{date.today().day}日"
    today_en = date.today().strftime("%b %-d, %Y")
    today_mmdd = date.today().strftime("%m-%d")

    zh_path = APP / "app" / "src" / "messages" / "zh.json"
    en_path = APP / "app" / "src" / "messages" / "en.json"

    for path, updates in [
        (zh_path, {"home.badge": f"{today_cn}最新数据", "home.statsUpdatedValue": today_mmdd}),
        (en_path, {"home.badge": f"Updated {today_en}", "home.statsUpdatedValue": today_mmdd}),
    ]:
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for dot_key, value in updates.items():
                parts = dot_key.split(".")
                target = data
                for p in parts[:-1]:
                    target = target.setdefault(p, {})
                if parts[-1] in target:
                    target[parts[-1]] = value
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write("\n")
        except Exception as e:
            warn(f"更新 {path.name} 日期文案失败: {e}")

if not DRY_RUN:
    update_i18n_dates()
    ok("日期文案已更新")
else:
    warn("DRY RUN: 跳过日期文案更新")

# ══════════════════════════════════════════════
# Phase 5: 验证
# ══════════════════════════════════════════════
step("Phase 5: 验证")

all_passed = True

# 5a. 测试
print("  Test: npm test -- --run")
out, rc = run("npm test -- --run", cwd=str(APP / "app"), exit_on_error=False)
if rc != 0:
    fail(f"测试失败 ({rc})")
    print(out[-2000:])
    all_passed = False
else:
    ok("测试通过")

# 5b. 构建
print("  Build: npm run build")
out, rc = run("npm run build", cwd=str(APP / "app"), exit_on_error=False)
if rc != 0:
    fail(f"构建失败 ({rc})")
    print(out[-2000:])
    all_passed = False
else:
    ok("构建成功")

# 5c. Lint
print("  Lint: npm run lint")
out, rc = run("npm run lint", cwd=str(APP / "app"), exit_on_error=False)
if rc != 0:
    fail(f"Lint 失败 ({rc})")
    print(out[-2000:])
    all_passed = False
else:
    ok("Lint 通过")

# 5d. 数据质量验证
print("  Validation: python3.11 scripts/validate-data.py")
out, rc = run("python3.11 scripts/validate-data.py", cwd=str(APP / "app"), exit_on_error=False)
if rc != 0:
    fail("数据质量验证失败")
    print(out[-2000:])
    all_passed = False
else:
    ok("数据质量验证通过")

# 5e. 数据管线 Python 单测（3-process，曾长期无人调用）
print("  Test: python3.11 -m unittest discover -s 3-process")
out, rc = run("python3.11 -m unittest discover -s 3-process -p 'test_*.py'", cwd=str(DATA), exit_on_error=False)
if rc != 0:
    fail(f"数据管线单测失败 ({rc})")
    print(out[-2000:])
    all_passed = False
else:
    ok("数据管线单测通过")

if not all_passed:
    fail("验证阶段存在失败项，停止并输出异常报告")
    print(f"\n⚠️ LLMCompare 数据刷新异常（{TODAY}）")
    print(f"\n验证失败，请检查错误并手动修复后重跑。")
    sys.exit(1)

# ══════════════════════════════════════════════
# Phase 6: 提交并推送（直接推 main）
# ══════════════════════════════════════════════
step("Phase 6: 提交并推送")

# 只显式暂存数据产物路径，避免 -A 把无关变更一起提交
# （无变化的路径 git add 不报错）
run("git add app/src/data app/src/messages app/public/sitemap.xml data/4-final data/5-history", cwd=str(APP))

# Check if there are staged changes
staged_diff, _ = run("git diff --cached --stat", cwd=str(APP), exit_on_error=False)
if staged_diff.strip():
    run('git commit -m "data: 刷新模型排名数据（' + TODAY + '）"', cwd=str(APP))
    ok("提交完成")
else:
    warn("无变更可提交")

# Check if branch has any commits vs main
branch_diff, _ = run("git log main.." + BRANCH + " --oneline", cwd=str(APP), exit_on_error=False)
if not branch_diff.strip():
    warn("分支与 main 无差异，跳过推送")
    run("git push origin --delete " + BRANCH, cwd=str(APP), exit_on_error=False)
    run("git checkout main", cwd=str(APP))
    ok("已切回 main，无变更")
    print()
    print("🔄 LLMCompare 数据刷新完成（" + TODAY + "）")
    print()
    print("📊 模型数: " + str(src_count))
    print()
    print("⚠️ 数据无变化，未推送")
    print()
    sys.exit(0)

# In CI (GitHub Actions), push directly to main; locally, create PR
diff_text = diff_content or "（无变化摘要）"
import shutil

if os.environ.get("CI"):
    # GitHub Actions: rebase onto latest main, merge branch, then push
    run("git fetch origin", cwd=str(APP))
    run("git checkout main", cwd=str(APP))
    run("git pull origin main --rebase", cwd=str(APP))
    run("git merge " + BRANCH + " --no-edit", cwd=str(APP))
    run("git push origin main", cwd=str(APP))
    ok("已推送到 main（CI 模式）")
    run("git push origin --delete " + BRANCH, cwd=str(APP), exit_on_error=False)
    run("git branch -d " + BRANCH, cwd=str(APP), exit_on_error=False)
else:
    pr_failed = False
    # Local: push branch and create PR
    run("git push origin " + BRANCH + " --force", cwd=str(APP))
    ok("分支已推送")

    gh = shutil.which("gh")
    if gh:
        pr_body = f"""## 📊 数据刷新 {TODAY}

**模型数**: {src_count}

{diff_text[:500]}

---
🤖 Hermes Agent 自动创建"""
        pr_out, pr_rc = run(
            f'gh pr create --base main --head {BRANCH} --title "data: 刷新模型排名数据（{TODAY}）" --body "{pr_body}"',
            cwd=str(APP), exit_on_error=False
        )
        if pr_rc != 0 or not pr_out.strip():
            fail(f"PR 创建失败 (exit={pr_rc}): {pr_out.strip()[:300] or '(空输出, 可能已存在同名分支的 PR)'}")
            pr_failed = True
        else:
            ok("PR 已创建: " + pr_out.strip())
    else:
        warn("gh CLI 未安装，请手动创建 PR")

    run("git checkout main", cwd=str(APP))
    run("git branch -d " + BRANCH, cwd=str(APP), exit_on_error=False)

    if pr_failed:
        fail("PR 创建失败，分支已推送但未建 PR，请手动处理")
        sys.exit(2)

# 从 diff 中提取关键指标（已提前到 PR 创建前）

# ══════════════════════════════════════════════
# Phase 7: 清理 — 切回 main
# ══════════════════════════════════════════════
step("Phase 7: 清理")

run("git checkout main", cwd=str(APP))
ok("app/ 已切回 main")

# ══════════════════════════════════════════════
# 输出飞书摘要
# ══════════════════════════════════════════════
step("输出摘要")

print()
print("🔄 LLMCompare 数据刷新完成（" + TODAY + "）")
print()
print("📊 模型数: " + str(src_count))
print()
print("[变化摘要]")
print(diff_text[:500])
print()
print("[验证结果]")
print("✅ 测试: 通过")
print("✅ 构建: 成功")
print("✅ Lint: 0 errors")
print("✅ 数据质量: 通过")
print("✅ 数据管线单测: 通过")
print()
print("🤖 Hermes Agent · 每日 12:00")

sys.exit(0)
