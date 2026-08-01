# 模型图鉴

全球主流 AI 模型数据，整理在一起。

[在线浏览](https://www.llmcompare.cc) · [GitHub](https://github.com/citrusli2026/llmcompare)

<img src="docs/screenshots/screenshot_home.png" alt="首页截图" width="80%" />

<img src="docs/screenshots/screenshot_models.png" alt="模型目录截图" width="80%" />

<img src="docs/screenshots/screenshot_detail.png" alt="详情页截图" width="80%" />

## 关于项目

模型图鉴是一个开源数据项目，收集和整理全球主流大语言模型的公开数据，包括：

- **智能评分** — Artificial Analysis 综合智能指数（整合 MMLU、HumanEval、MATH 等基准）
- **编程能力** — Artificial Analysis 编程专项评分
- **Agent 能力** — Artificial Analysis Agent 专项评分
- **Benchmark 明细** — GPQA、HLE、SciCode、LCR、τ²-bench、Terminal-Bench Hard 等 12 项单项基准分数
- **速度性能** — 中位 TPS、首 Token 延迟、端到端延迟
- **Arena 排名** — lmarena.ai 编程/视觉排行榜 ELO 分数
- **Arena 投票** — lmarena.ai 人类盲测累计投票数（反映真实热度）
- **官方定价** — 各厂商标准 API 定价 + OpenRouter 市场行情定价
- **工具调用与最大输出** — function calling 支持情况、单次响应最大输出 tokens
- **近 30 天趋势** — 智能分 / 混合价格 / 榜单排名的趋势图（模型详情页）
- **知识截止** — 模型训练数据截止日期
- **开源协议** — 开源模型的 License 信息

国际模型与国内模型统一排序展示。`/models` 列表默认排序规则：**开源模型按 OpenRouter 周用量降序，闭源模型按智能分降序**，便于分别发现热门开源模型和最强闭源模型。

数据每日自动刷新（详见 `data/pipeline.py`）。

## 主要页面

- `/` — 首页：场景化推荐（热度 / 智能 / 编程 / Agent / 性价比）+ Top Picks
- `/models` — 模型目录：全量可排序表格，支持搜索关键词、按公司与标签筛选
- `/models/{id}` — 模型详情：分数概览、近 30 天趋势图、基准/速度/价格明细、相似模型推荐
- `/compare` — 模型对比：最多 3 个模型并排比较，对比组合可通过 URL 分享（`?models=`）
- `/favorites` — 我的收藏：保存在浏览器本地，可生成链接分享或导入到其他设备（`?ids=`）
- `/about` — 数据来源与方法论

## 数据管线

```
../data/1-fetch/      → 抓取 Artificial Analysis / OpenRouter / Arena
../data/3-process/    → 3 步处理管线：构建前端模型 → 富化+切活跃 → 生成报告
../data/4-final/      → ranking.json (活跃) + ranking_all.json (全量)
../app/src/data/      → 同步 ranking.json 给前端消费
```

完整流程由 `../data/pipeline.py` 一键编排（分支准备 → 抓取 → 处理 → 同步 → 验证 → 提交 → 清理），日常无需手工跑各步骤。

模型筛选策略：`build_frontend_models.py` 从 AA 全量数据直接读取，按三档条件（Large / frontier / intel≥30）筛选，同时用 `excluded_patterns` 黑名单去旧（维护在 `data/0-refer/model_reference.json`）。不再依赖单独的国内筛选步骤。

- **data_complete**: 富化时计算，需 `intelligence + coding + agentic + speed + pricing` 五维度齐全；缺一即 `false`
- **OpenRouter 周用量**: 作为热度指标注入
- **静态链接**: 仅保留 `homepage`（模型官网）和 `console`（模型控制台），剔除试用链接与第三方开源站点
- **验证脚本**: `scripts/validate-data.py` + Vitest/Build/Lint 在 `pipeline.py` Phase 5 一起跑

## 本地运行

```bash
cd app && npm install && npm run dev
```

## 技术栈

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Vitest · Playwright

仅亮色主题（锁定 light），支持中英文双语。

## 测试

```bash
cd app
npm test              # 单元测试 + 集成测试 (Vitest)
npm run test:e2e      # E2E 测试 (Playwright)
npm run build         # 构建 + 静态导出验证
python3 scripts/validate-data.py  # 数据质量验证
```

## 贡献

修正或补充模型信息 → [提交 Issue](https://github.com/citrusli2026/llmcompare/issues)

模型详情页会为缺失字段显示「提交数据补全」入口，自动跳转到 GitHub Issues 并预填充模型名与待补全字段。

## License

MIT
