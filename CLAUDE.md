# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供本仓库的编码指引。

## 项目概览

LLMCompare 是一个静态 Next.js 站点，用于排名国内中文 AI 大语言模型。它展示各家厂商（百度、阿里、腾讯、字节跳动、DeepSeek 等）大模型的基准测试分数、API 性能指标以及 Arena AI ELO 排名。

## 常用命令

| 命令 | 说明 |
|---------|-------------|
| `npm run dev` | 在 `localhost:3000` 启动开发服务器 |
| `npm run build` | 构建静态导出到 `dist/` 目录（通过 `output: 'export'` 配置） |
| `npm run lint` | 运行 ESLint（扁平化配置，Next.js 预设） |

本项目未配置测试运行器。

## 技术栈

- **Next.js 16.2.4**（App Router）—— 静态导出模式
- **React 19.2.4** + **TypeScript**
- **Tailwind CSS v4**（无 `tailwind.config.js`；通过 CSS 中 `@theme inline` 配置）
- **shadcn/ui** 使用 `@base-ui/react` 底层组件（`style: "base-nova"`）
- **next-themes** 实现暗色/亮色切换（默认暗色，`enableSystem: false`）
- **Geist / Geist Mono** 字体，通过 `next/font/google` 加载

## 重要提示：Next.js 破坏性变更

此版本与你训练数据中的标准 Next.js 不同。API、约定和文件结构均有破坏性变更。编写任何 Next.js 代码之前，请先阅读 `node_modules/next/dist/docs/` 中的相关指南，并留意弃用通知。

## 架构

### 路由（App Router）

| 路由 | 文件 | 类型 |
|-------|------|------|
| `/` | `src/app/page.tsx` | 服务端组件 — 首页 Hero 区域 + 前6名模型卡片网格 |
| `/models` | `src/app/models/page.tsx` | 客户端组件 — 完整的可排序/可筛选排名表格 |
| `/product/[id]` | `src/app/product/[id]/page.tsx` | 服务端组件 — 模型详情页，使用 `generateStaticParams()` |

所有数据均来自静态 JSON 文件；没有 API 路由。

### 数据层

模型数据全部存放在 `src/data/` 目录：

- **`src/data/ranking.json`** — 唯一事实来源。模型对象数组，包含 `id`、`name`、`company`、`type`（开源/闭源）、`scores`、`speed`、`pricing`、`flags`、`meta` 等字段。直接展示原始分数，无归一化处理。

**数据展示原则：**
- 所有分数直接使用原始数据（如 intelligence 原始分、median_tps 原始值）
- 成本优先显示国内定价（¥/M），无国内价则显示 AA 混合价（$/M）
- 缺失数据显示 `—`，不参与计算

### 数据管线（上游 `../data/` 目录）

`src/data/ranking.json` 由上游数据管线 `../data/` 产出，不是手动编写。管线结构：

| 阶段 | 目录 | 功能 |
|------|------|------|
| 参考数据 | `0-refer/` | 耐久参考：厂商链接、国内官价映射（手动维护） |
| 数据抓取 | `1-fetch/` | 从 Artificial Analysis 爬取原始数据 |
| 原始数据 | `2-raw/` | 抓取产出（~512 模型 × 72 字段），只读 |
| 数据处理 | `3-process/` | 5 步处理管线（筛选 → 字段选型 → 构建 → 富化 → 报告） |
| 最终输出 | `4-final/` | `ranking.json`（活跃模型 ≤180 天）+ `ranking_all.json`（全量） |

**处理管线 4 步筛选（对应 About 页面的"榜单筛选"描述）：**

1. **国内模型筛选** (`filter_cn_models.py`) — 按公司名 + 模型名关键词双重匹配，从 ~512 个模型中筛选出约 134 个国内模型
2. **Large 模型筛选** (`build_frontend_models.py`) — 只保留 `size_class == "Large"` 的模型，去重后约 50 个
3. **富化 + 日期筛选** (`enrich_models.py`) — 注入厂商链接和国内官价；按发布时间 ≤180 天筛选活跃模型，最终约 27-30 个
4. **数据完整标记** (`build_frontend_models.py`) — 每模型计算 `flags.data_complete`（需同时具备 intelligence 分数 + speed 数据 + pricing 数据）

**评分职责边界：**
- 管线（Python）只做数据清洗和格式转换，不做评分计算
- 前端（`scoring.ts`）负责综合分、权重配比

**注意：** 修改 About 页面"榜单筛选"文案时，需与 `data/CLAUDE.md` 中的管线描述保持一致。

### 组件约定

- `src/components/ui/*` — shadcn/ui 组件（Button、Badge、Input、Table、Tabs、Card）。使用 `npx shadcn add <组件名>` 添加新组件。
- `src/components/*` — 应用专属组件：`Navbar`、`ProductCard`、`RankingTable`、`ScoreBar`、`FilterBar`、`ThemeToggle`、`ThemeProvider`、`LanguageProvider`。
- 所有 UI 组件均为 `@base-ui/react` 底层组件的薄封装，使用 `cva` + `cn()` 进行样式处理。
- `src/lib/utils.ts` 导出 `cn()`（clsx + tailwind-merge）。

### 国际化（i18n）

- 使用 Context 方案（保留静态导出 `output: 'export'`）
- 翻译文件：`src/messages/zh.json`（中文）、`src/messages/en.json`（英文）
- 翻译上下文：`src/lib/i18n.tsx`（`useTranslation` hook）
- 语言状态存储在 `localStorage`，key 为 `llmcompare-locale`
- 新增文本：所有页面文本需同时写入两个翻译文件，通过 `t("key.subkey")` 使用

### 样式

- Tailwind v4，在 `src/app/globals.css` 中通过 `@import "tailwindcss"` 引入。
- 主题令牌使用 CSS 自定义属性。通过 `.dark` 类切换亮/暗模式。
- 自定义表面色（`--surface-base`、`--surface-card` 等）和强调色（`--accent-violet`、`--accent-cyan` 等）定义于 `globals.css` 中，并在整个应用中使用。
- 无 `tailwind.config.js` — 配置通过 CSS 中的 `@theme inline` 内联完成。

### 构建与部署

- 静态导出（`output: 'export'`）输出到 `dist/` 目录。
- 图片未优化（`images.unoptimized: true`），因为静态导出不支持 Next.js 图片优化。
- 站点预期部署到 Vercel 或任意静态托管服务。
