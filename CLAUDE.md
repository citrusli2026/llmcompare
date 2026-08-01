# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供本仓库的编码指引。

## 项目概览

LLMCompare（模型图鉴）是一个静态 Next.js 站点，用于排位全球 AI 大语言模型。它展示各家厂商模型的基准测试分数、API 性能指标以及 Arena ELO 排名。

## 常用命令

| 命令 | 说明 |
|---------|-------------|
| `npm run dev` | 在 `localhost:3000` 启动开发服务器 |
| `npm run build` | 先运行 `scripts/generate-sitemap.mjs` 生成 sitemap，再构建静态导出到 `dist/` 目录 |
| `npm run prebuild` | 自动在 build 前执行，删除 `dist/` 目录 |
| `npm run build:turbo` | 同上但使用 Turbopack（默认 `build` 走 webpack） |
| `npm run lint` | 运行 ESLint（扁平化配置，Next.js 预设） |
| `npm test` | 运行 Vitest 单元/集成测试（watch 模式） |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |
| `npm run test:e2e` | 运行 Playwright E2E 测试（等价 `npx playwright test`） |

## 技术栈

- **Next.js 16.2.10**（App Router）—— 静态导出模式
- **React 19.2.4** + **TypeScript**
- **Tailwind CSS v4**（无 `tailwind.config.js`；通过 CSS 中 `@theme inline` 配置）
- **shadcn/ui** 使用 `@base-ui/react` 底层组件（`style: "base-nova"`）
- **仅亮色主题**（`ThemeProvider` 强制 `light` class；不接 next-themes，不支持深色）
- **Rubik / Geist Mono** 字体，通过 `next/font/google` 加载
- **@vercel/analytics** 网站分析
- **Vitest** + **@testing-library/react** + **jsdom** — 单元/集成测试
- **Playwright** — E2E 测试（桌面端 + 移动端双配置）

## 重要提示：Next.js 破坏性变更

此版本与你训练数据中的标准 Next.js 不同。API、约定和文件结构均有破坏性变更。编写任何 Next.js 代码之前，请先阅读 `node_modules/next/dist/docs/` 中的相关指南，并留意弃用通知。

## 架构

### 路由（App Router）

| 路由 | 文件 | 类型 |
|-------|------|------|
| `/` | `src/app/page.tsx` | 服务端组件 — 首页 Hero 区域 + 前6名模型卡片网格 |
| `/models` | `src/app/models/page.tsx` | 服务端组件包装器 → `models-page-client.tsx` 客户端组件 — 完整的可排序/可筛选/可搜索排名表格，全部模型统一排序 |
| `/models/[id]` | `src/app/models/[id]/page.tsx` | 服务端组件 — 模型详情页，使用 `generateStaticParams()` 和 `generateMetadata()` |
| `/compare` | `src/app/compare/page.tsx` | 服务端组件包装器 → `compare-client.tsx` 客户端组件 — 模型并排对比（最多 3 个，组合存 URL `?models=`） |
| `/favorites` | `src/app/favorites/page.tsx` | 服务端组件包装器 → `favorites-page-client.tsx` 客户端组件 — 本地收藏清单 + `?ids=` 只读分享视图（robots noindex） |
| `/about` | `src/app/about/page.tsx` | 服务端组件包装器 → `about-page-client.tsx` 客户端组件 — 关于页面 |

所有数据均来自静态 JSON 文件；没有 API 路由。

**页面模式差异：**
- `/models`、`/compare`、`/favorites` 和 `/about` 使用「服务端组件包装器 + 客户端组件」模式，因为页面包含交互状态（筛选、排序、标签切换）
- `/models/[id]` 是服务端组件（详情主体为 `product-detail` 客户端组合层），在 `generateStaticParams()` 中为所有模型预生成静态路径，并通过 `generateMetadata()` 动态生成 SEO 元数据

### 布局与 Hydration 策略

`src/app/layout.tsx` 包含两个内联脚本（`localeScript` + `themeScript`），在 HTML `<head>` 中早于 React hydration 执行：
- **主题**：直接给 `<html>` 加 `light` class（项目只支持亮色，无主题切换）
- **语言**：读取 `localStorage` 的 `llmcompare-locale` 键，非中文用户 SSR 输出时先将 `<html>` 设为 `visibility: hidden`，hydration 完成后由 `i18n.tsx` 中的 `useEffect` 恢复可见，避免中文内容闪烁

产品详情页（`/models/[id]`）还注入 JSON-LD 结构化数据（SoftwareApplication + BreadcrumbList）用于 SEO。

### 数据层

模型数据全部存放在 `src/data/` 目录：

- **`src/data/ranking.json`** — 唯一事实来源。模型对象数组，包含 `id`、`name`、`company`、`type`（开源/闭源）、`scores`、`pricing`、`flags`、`meta`、`arena_rankings` 等字段。直接展示原始分数，无归一化处理。

**数据展示原则：**
- 所有分数直接使用原始数据（如 intelligence 原始分、Arena ELO 分数）
- 成本优先显示国内定价（¥/M），无国内价则显示 AA 混合价（$/M）
- 缺失数据显示 `—`，不参与计算
- 国际/国内模型统一参与排序，无固定置顶（见下文「国际模型呈现」）

### 数据管线（上游 `../data/` 目录）

`src/data/ranking.json` 由上游数据管线 `../data/` 产出，不是手动编写。管线结构：

| 阶段 | 目录 | 功能 |
|------|------|------|
| 参考数据 | `0-refer/` | 耐久参考：厂商链接、国内官价映射（手动维护） |
| 数据抓取 | `1-fetch/` | 从 Artificial Analysis / OpenRouter / Arena 爬取原始数据 |
| 原始数据 | `2-raw/` | 抓取产出（AA 全量模型 + OR/Arena 快照），只读缓存 |
| 数据处理 | `3-process/` | 3 步处理管线（构建前端 → 富化+切活跃 → 报告） |
| 编排入口 | `pipeline.py` | 一键编排：分支准备 → 抓取 → 处理 → 同步 → 验证 → 提交 PR |
| 变化摘要 | `scripts/diff-ranking.py` | 两次 ranking.json 的差异报告（被 `pipeline.py` 调用） |
| 最终输出 | `4-final/` | `ranking.json`（活跃模型 ≤180 天）+ `ranking_all.json`（全量） |

**处理管线 3 步（对应 About 页面的"榜单筛选"描述）：**

1. **构建前端模型** (`build_frontend_models.py`) — 策略 C 三档条件筛选（Large 尺寸 / 前沿标杆 / 智能分≥30），字段翻译/格式统一
2. **富化 + 切活跃** (`enrich_models.py`) — 注入厂商链接、国内官价、OpenRouter 定价/调用量、Arena 排名与投票数；按发布时间 ≤180 天切活跃集；同时**重新计算** `flags.data_complete`（5 维度齐全：intelligence + coding + agentic + speed(>0) + pricing）
3. **报告** (`build_report.py`) — 输出 `4-final/report.html` + 终端摘要

**国际模型呈现：**
- 国际/国内共用一张可排序表格（`/models`），由 `useModelGroups` 单一 group（`key: "all"`）统一排序，不再分组
- `isInternational` 标志在 `lib/scoring.ts` 中由 `!flags.chinese_eval` 推导；仅供条件染色/筛选使用
- 国际模型不固定置顶，会随用户选择的排序键参与全局排序

**搜索与筛选（`/models`）：**
- 关键词搜索（`?q=`，匹配模型名/id/公司）、公司下拉筛选（`?company=`）、标签筛选（`?filter=`，开源/闭源等）
- 筛选状态全部同步到 URL，可直接分享筛选结果链接

**趋势图（详情页）：**
- `product-detail/trend-section.tsx` 读取 `src/data/trends.json`（管线 `build_trends.py` 产出），渲染近 30 天智能分 / 混合价格 / 排名趋势

**收藏与分享：**
- `hooks/use-favorites.ts` 把收藏 id 存 localStorage（`llmcompare-favorites`），跨 tab 通过 `storage` 事件同步
- `/favorites` 展示收藏清单；`favorites-share.ts` 负责 id 列表 ⇄ URL 序列化，`/favorites?ids=` 为只读分享视图，可一键导入合并
- 对比选择由 `hooks/use-compare-ids.ts` 管理（URL `?compare=` + localStorage 镜像），桌面最多 3 个 / 移动端 2 个

**评分职责边界：**
- 管线（Python）只做数据清洗和格式转换，不做评分计算
- 前端（`scoring.ts`）负责综合分、权重配比

**注意：** 修改 About 页面"榜单筛选"文案时，需与 `data/CLAUDE.md` 中的管线描述保持一致。

### 数据更新操作流程

日常刷新**不需要**手工跑各步骤 —— 直接执行上游 `data/pipeline.py`：

```bash
cd ../data && python3 pipeline.py            # 全自动：抓取 + 处理 + 同步 + 验证 + PR
cd ../data && python3 pipeline.py --skip-fetch   # 复用 2-raw 缓存
cd ../data && python3 pipeline.py --dry-run      # 演练，不写盘
```

`pipeline.py` 会自动完成：
1. `app/` 切日期分支、`data/` 保持 main
2. 抓取 AA / OR / Arena（带 6h 缓存）
3. 跑 3 步处理管线
4. `data/` 本地提交 + 调用 `scripts/diff-ranking.py` 生成 PR 摘要
5. 同步 `4-final/ranking.json` → `app/src/data/ranking.json`
6. 更新 `src/messages/{zh,en}.json` 的三个日期 key：`about.badge`、`about.backgroundDesc`、`home.statsUpdatedValue`
7. 跑 vitest + build + lint + `validate-data.py`，任一失败立即停止
8. `app/` 提交并 `gh pr create`
9. 注册 10 分钟后的一次性 cron job 自动监控并合并 PR
10. 最后切回 main

如果只想**手工**执行某一步，仍可单独跑：

```bash
# 抓取（按需）
cd ../data && python3 1-fetch/fetch_aa_data.py --output 2-raw/
cd ../data && python3 1-fetch/fetch_or_models.py
cd ../data && python3 1-fetch/fetch_arena_leaderboards.py

# 处理管线
cd ../data/3-process && python3.11 build_frontend_models.py
cd ../data/3-process && python3.11 enrich_models.py
cd ../data/3-process && python3.11 build_report.py

# 同步
cp ../data/4-final/ranking.json src/data/ranking.json
```

提交规范：

```
data: 刷新模型排名数据（YYYY-MM-DD）
```

### 组件约定

- `src/components/ui/*` — shadcn/ui 组件（Button、Badge、Input、Table、Tabs、Card）。使用 `npx shadcn add <组件名>` 添加新组件。
- `src/components/*` — 应用专属组件：`Navbar`、`FilterBar`、`FavoriteButton`、`ShareButton`、`CompareBar`、`ChangesCard`、`LanguageToggle`、`ThemeProvider`、`LanguageProvider`。
  - `RankingTable/` — 已拆分为子模块：`index.tsx`（主组件）、`model-row.tsx`（桌面行）、`mobile-card.tsx`（移动端卡片）、`use-model-groups.ts`（分组逻辑：单一 group 统一排序）、`utils.tsx`（分位/颜色计算）、`types.ts`。桌面端排序表头为 `button` + `aria-sort`（可键盘操作）。
  - `product-detail/` — 已拆分为子组件：`index.tsx`（组合层）、`model-header.tsx`、`cta-group.tsx`、`quick-facts.tsx`、`score-overview.tsx`、`trend-section.tsx`、`benchmark-section.tsx`、`speed-section.tsx`、`pricing-section.tsx`、`similar-models.tsx`、`data-completion-callout.tsx`。
- 所有 UI 组件均为 `@base-ui/react` 底层组件的薄封装，使用 `cva` + `cn()` 进行样式处理。
- `src/lib/utils.ts` 导出 `cn()`（clsx + tailwind-merge）和共享工具函数（`formatTokenCount`、`getTypeBadgeClasses` 等）。

### 国际化（i18n）

- 使用 Context 方案（保留静态导出 `output: 'export'`）
- 翻译文件：`src/messages/zh.json`（中文）、`src/messages/en.json`（英文）
- 翻译上下文：`src/lib/i18n.tsx`（`useTranslation` hook）
- 语言状态存储在 `localStorage`，key 为 `llmcompare-locale`
- 新增文本：所有页面文本需同时写入两个翻译文件，通过 `t("key.subkey")` 使用

### 样式

- Tailwind v4，在 `src/app/globals.css` 中通过 `@import "tailwindcss"` 引入。
- 主题令牌使用 CSS 自定义属性。仅亮色主题，`<html>` 锁定 `light` class（无暗色切换）。
- 自定义表面色（`--surface-base`、`--surface-card` 等）和强调色（`--accent-violet`、`--accent-cyan` 等）定义于 `globals.css` 中，并在整个应用中使用。
- 无 `tailwind.config.js` — 配置通过 CSS 中的 `@theme inline` 内联完成。

### 构建与部署

- 静态导出（`output: 'export'`）输出到 `dist/` 目录。
- 图片未优化（`images.unoptimized: true`），因为静态导出不支持 Next.js 图片优化。
- 构建时自动生成 `public/sitemap.xml`（`scripts/generate-sitemap.mjs`），包含静态页面 + 所有产品页 URL。
- 站点预期部署到 Vercel 或任意静态托管服务。
- `vercel.json` 配置了静态资源长期缓存（`max-age=31536000`）和 sitemap/robots 的 24 小时缓存。
