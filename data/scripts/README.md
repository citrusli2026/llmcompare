# Data Scripts

## diff-ranking.py

数据变化摘要脚本。对比两次 ranking.json，生成结构化差异报告。

### 用法

```bash
# 自动对比 git 上次提交和当前数据
cd /Users/citrus/code-ai/llmcompare/data
python3 scripts/diff-ranking.py

# 对比指定两个文件
python3 scripts/diff-ranking.py path/to/prev.json path/to/curr.json
```

### 输出

- **Markdown** 到 stdout：新增/移除模型、分数变化、排名变化、Arena votes 变化、完整度变化
- **JSON** 到 `/tmp/ranking-diff.json`：供程序解析

### 集成到定时任务

在 skill 的 Phase 3 中执行：
```bash
python3 scripts/diff-ranking.py > /tmp/data-diff.md
```

然后在飞书通知中嵌入 `/tmp/data-diff.md` 内容。
