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
APP = BASE  # app/ is the repo root
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
    if result.returncode != 0 and exit_on_error:
        fail(f"命令失败 (exit={result.returncode}): {cmd}")
        print(result.stderr[:500])
        sys.exit(2)
    return result.stdout.strip(), result.returncode


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
    run(f"git checkout {BRANCH} && git merge main --no-edit", cwd=str(APP), exit_on_error=False)
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

if SKIP_FETCH:
    ok("--skip-fetch 标记, 跳过所有抓取")
else:
    for name, cache_rel, cmd in fetches:
        if is_cache_fresh(DATA / cache_rel):
            ok(f"{name} 缓存有效 ({CACHE_FRESH_HOURS}h内), 跳过抓取")
        else:
            warn(f"{name} 缓存过期, 执行抓取...")
            run(cmd, cwd=str(DATA))
            ok(f"{name} 数据抓取完成")

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
# Phase 3: 变化摘要（不提交，留给 Phase 6 统一处理）
# ══════════════════════════════════════════════
step("Phase 3: 变化摘要")

# diff 摘要
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
src_count, _ = run('python3.11 -c "import json;print(len(json.load(open(\'4-final/ranking.json\'))))"', cwd=str(DATA))
dst_count, _ = run('python3.11 -c "import json;print(len(json.load(open(\'src/data/ranking.json\'))))"', cwd=str(APP / "app"))
if src_count != dst_count:
    warn(f"cp 不完整! data/={src_count} app/={dst_count}，重试...")
    run("cp 4-final/ranking.json ../app/src/data/ranking.json", cwd=str(DATA))
    dst_count, _ = run('python3.11 -c "import json;print(len(json.load(open(\'src/data/ranking.json\'))))"', cwd=str(APP / "app"))
ok(f"ranking.json: {src_count} 模型 → app/({dst_count})")

# metadata.json — 写入更新时间戳，前端关于页读取
from datetime import datetime, timezone
metadata = {"updated_at": datetime.now(timezone.utc).isoformat()}
metadata_path = APP / "app" / "src" / "data" / "metadata.json"
metadata_path.write_text(json.dumps(metadata, indent=2))
ok(f"metadata.json: updated_at={metadata['updated_at']}")

# 日期文案 - 使用整行替换避免累积
today_cn = f"{date.today().year}年{date.today().month}月{date.today().day}日"
today_dot = date.today().strftime("%Y.%m.%d")

import re

def sed_replace(filepath, pattern, replacement):
    """Cross-platform sed replacement using Python"""
    p = Path(filepath)
    content = p.read_text()
    content = re.sub(pattern, replacement, content)
    p.write_text(content)

zh_json = str(APP / "app" / "src/messages/zh.json")
en_json = str(APP / "app" / "src/messages/en.json")

# zh.json — 替换整个 badge 值
sed_replace(zh_json, r'"badge": "[^"]*"', f'"badge": "{today_cn}最新数据"')
sed_replace(zh_json, r'上次更新：[0-9.]+', f'上次更新：{today_dot}')

# en.json — 替换整个 badge 值
today_en = date.today().strftime("%b %-d, %Y")
today_dot_en = date.today().strftime("%Y.%m.%d")
sed_replace(en_json, r'"badge": "[^"]*"', f'"badge": "Updated {today_en}"')
sed_replace(en_json, r'Last updated: [0-9.]+', f'Last updated: {today_dot_en}')

# stats-strip 更新日期（MM-DD 格式）
today_mmdd = date.today().strftime("%m-%d")
sed_replace(zh_json, r'"statsUpdatedValue": "[^"]*"', f'"statsUpdatedValue": "{today_mmdd}"')
sed_replace(en_json, r'"statsUpdatedValue": "[^"]*"', f'"statsUpdatedValue": "{today_mmdd}"')
ok("日期文案已更新")

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

if not all_passed:
    fail("验证阶段存在失败项，停止并输出异常报告")
    print(f"\n⚠️ LLMCompare 数据刷新异常（{TODAY}）")
    print(f"\n验证失败，请检查错误并手动修复后重跑。")
    sys.exit(1)

# ══════════════════════════════════════════════
# Phase 6: 提交 PR + 飞书通知
# ══════════════════════════════════════════════
step("Phase 6: 提交 PR")

# DEBUG: show git state
branch_now, _ = run("git branch --show-current", cwd=str(APP), exit_on_error=False)
warn(f"[DEBUG] 当前分支: {branch_now}")
run("git status --short", cwd=str(APP), exit_on_error=False)
warn(f"[DEBUG] APP={APP} DATA={DATA}")

# Stage from repo root to capture all changes (metadata.json, ranking.json, etc.)
run("git add -A", cwd=str(APP))

# Check if there are staged changes
staged_diff, _ = run("git diff --cached --stat", cwd=str(APP), exit_on_error=False)
warn(f"[DEBUG] staged_diff={staged_diff[:300]}")
if staged_diff.strip():
    run('git commit -m "data: 刷新模型排名数据（' + TODAY + '）"', cwd=str(APP))
    ok("提交完成")
    # DEBUG: verify commit
    commit_sha, _ = run("git rev-parse HEAD", cwd=str(APP), exit_on_error=False)
    main_sha, _ = run("git rev-parse main", cwd=str(APP), exit_on_error=False)
    warn(f"[DEBUG] HEAD={commit_sha} main={main_sha} same={commit_sha == main_sha}")
else:
    warn("无变更可提交")

# Check if branch has any commits vs main
branch_diff, _ = run(f"git log main..{BRANCH} --oneline", cwd=str(APP), exit_on_error=False)
if not branch_diff.strip():
    warn("分支与 main 无差异，跳过 PR 创建")
    # Clean up: delete remote branch if it exists
    run(f"git push origin --delete {BRANCH}", cwd=str(APP), exit_on_error=False)
    run("git checkout main", cwd=str(APP))
    ok("已切回 main，无 PR 创建")
    # Print summary without PR
    print()
    print(f"🔄 LLMCompare 数据刷新完成（{TODAY}）")
    print()
    print(f"📊 模型数: {src_count}")
    print()
    print("⚠️ 数据无变化，未创建 PR")
    print()
    sys.exit(0)

run("git push -u origin " + BRANCH, cwd=str(APP))
ok("推送完成")

# 从 diff 中提取关键指标
diff_text = diff_content or "（无变化摘要）"

# 构建 PR body
pr_body = f"""## 数据刷新（{TODAY}）

### 数据源更新
- **Artificial Analysis**: {src_count} 模型
- **Arena Leaderboards**: 日期快照

### 验证状态
- ✅ Vitest: 通过
- ✅ Build: 静态导出成功
- ✅ Lint: 0 errors
- ✅ 数据质量: 通过
"""

with open("/tmp/pr-body.md", "w") as f:
    f.write(pr_body)

out, rc = run(f"gh pr create --title \"data: 刷新模型排名数据（{TODAY}）\" --body-file /tmp/pr-body.md",
              cwd=str(APP), exit_on_error=False)

pr_url = ""
if rc == 0:
    pr_url = out
    ok(f"PR 创建成功: {pr_url}")
else:
    warn(f"PR 创建失败: {out[:300]}")

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
print(f"🔄 LLMCompare 数据刷新完成（{TODAY}）")
print()
print(f"📊 模型数: {src_count}")
print()
print(f"[变化摘要]")
print(diff_text[:500])
print()
print("[验证结果]")
print("✅ 测试: 通过")
print("✅ 构建: 成功")
print("✅ Lint: 0 errors")
print("✅ 数据质量: 通过")
print()
if pr_url:
    print(f"[PR]")
    print(f"🔗 {pr_url}")
print()
print(f"🤖 Hermes Agent · 每日 23:00")

sys.exit(0)
