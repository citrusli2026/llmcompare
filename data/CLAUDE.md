# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

`data/` 是 LLMCompare（模型图鉴）站点的数据生产管线，纯 Python 标准库实现，无第三方依赖。
最终产物是 `4-final/ranking.json`，由上层前端 `../app/src/data/ranking.json` 直接消费。

管线职责：从 Artificial Analysis 全量模型 → **按尺寸+智商+去旧三档过滤** → 注入厂商链接/国内官价/OpenRouter/Arena 多源数据 → 按发布日期切活跃集 → 输出 JSON。国内模型识别由 `cn_classifier.py` 动态标记，不再需要独立筛选步骤。

**评分边界**：管线**不**做归一化、综合分、tier 分层、性价比计算 —— 这些全部由前端 `scoring.ts` 负责。Python 只做字段翻译、格式统一、数据合并。

## 常用命令

**一键入口**（日常刷新用这个）：

| 命令 | 说明 |
|------|------|
|`python3.11 pipeline.py` | 全自动：分支准备 → 抓取 → 处理 → 同步 → 验证 → PR/推送 → 清理。CI 模式下会 rebase 到最新 main 再推送，避免并发提交冲突|
|`python3.11 pipeline.py --skip-fetch` | 复用 `2-raw/` 缓存，跳过抓取 |
|`python3.11 pipeline.py --dry-run` | 演练，不写盘、不推分支 |
|`python3.11 pipeline.py --cache-hours N` | 自定义缓存新鲜度（默认 6h，`0` 强制重抓） |

**手工单步**（调试或重跑某段时）：

| 步骤 | 命令 | 输入 → 输出 |
|------|------|--------------|
| 抓 AA | `cd 1-fetch && python3.11 fetch_aa_data.py --output ../2-raw/` | 网络 → `2-raw/aa_all_full.json`、`aa_top64_full.json` |
| 抓 OpenRouter | `python3.11 1-fetch/fetch_or_models.py` | 网络 → `2-raw/or_models.json` + `or_models_full.json` + `or_rankings.json` |
| 抓 Arena | `python3.11 1-fetch/fetch_arena_leaderboards.py` | 网络 → `2-raw/arena_leaderboards.json` |
| Step 1 构建模型 | `cd 3-process && python3.11 build_frontend_models.py` | `2-raw/aa_all_full.json` → `4-final/ranking_all.json` |
| Step 3 富化 + 切活跃 | `python3.11 enrich_models.py [max_age_days]` | `ranking_all.json` + 多源数据 → `ranking_all.json`（覆盖）+ `ranking.json`（≤180 天） |
| Step 4 报告 | `python3.11 build_report.py` | `ranking.json` → `4-final/report.html` + 终端摘要 |
| 差异摘要 | `python3.11 scripts/diff-ranking.py` | 两次 `ranking.json` → stdout Markdown + `/tmp/ranking-diff.json` |

完整处理管线：`build_frontend_models.py → enrich_models.py → build_report.py`，必须按顺序执行（每一步依赖上一步的输出）。`filter_cn_models.py` 已从主管线移除，仅保留为独立诊断工具。

抓取脚本是按需独立运行的，**不是**每次重跑管线都需要抓 —— `2-raw/` 通常作为缓存，只在需要刷新时跑 `1-fetch/`。`pipeline.py` 默认带 12h 缓存自动判断是否重抓。

## 目录与数据流

```
pipeline.py             一键编排入口 (分支准备 → 抓取 → 处理 → 同步 → 验证 → PR → 清理)

0-refer/  人工维护的参考表 (耐久, 不被管线覆写)
  ├── model_reference.json     厂商链接 + 国内官价 (cn_pricing) + license + 变体合并(variant_groups) + 跨代去旧(excluded_patterns)
  ├── arena_name_mapping.json  AA 模型名 → Arena 模型名 显式映射
  ├── arena_variant_map.json   变体聚合表 (子模型 → 父模型, 用于 Arena 排名继承)
  ├── validation_config.json   验证共享配置 (完整度权重 / 阈值默认 / 动态阈值 / 新鲜度阈值)
  ├── 01_国内大模型厂商官网与文档链接.md
  ├── 02_国内大模型API价格大全.md
  └── 03_模型-厂商链接-价格映射.md

1-fetch/  抓取脚本 + 字段文档
  ├── fetch_aa_data.py            AA RSC header trick (Next.js 序列化载荷)
  ├── fetch_or_models.py          OpenRouter /api/v1/models + RSC rankings/analytics
  ├── fetch_arena_leaderboards.py oolong-tea-2026/arena-ai-leaderboards 镜像
  ├── aa_data_extraction.md       AA 字段完整定义 + 覆盖率
  ├── README.md                   本目录使用说明
  └── SKILL.md                    Claude Code skill 定义

2-raw/    抓取产出 (只读, 禁止手动编辑)
  ├── aa_all_full.json        AA 全量模型
  ├── aa_top64_full.json      Intelligence Index 前 64 名
  ├── or_models_full.json     OpenRouter 调用量分析 (analytics)
  ├── or_models.json          OpenRouter 平台定价 (/api/v1/models)
  ├── or_rankings.json        OpenRouter 周请求量排名
  ├── arena_leaderboards.json Arena text/code/vision 三榜单
  └── flagship_top3.json      [历史] 早期固定 GPT-5.5/Claude/Gemini 三件套, 已废弃, 保留供历史参考

3-process/  3 步处理管线
  ├── filter_cn_models.py     [已从主管线移除] 独立诊断工具, 按关键词筛国内模型
  ├── build_frontend_models.py Step 1: 字段翻译 + 三档过滤 (Large/frontier/intel≥30) + 去旧
  ├── enrich_models.py        Step 2: 注入多源数据 + 日期筛选 + 变体简化
  ├── build_report.py         Step 3: HTML 报告 + 终端摘要
  ├── cn_classifier.py        国内厂商/模型名关键词表 (filter_cn_models 共享)
  ├── text_utils.py           名称归一化/子串匹配工具 (enrich_models 共享)
  ├── select_fields.py        独立工具 (产出 models.json/models_full.json, 不在主管线)
  ├── test_cn_classifier.py   cn_classifier 单元测试
  ├── test_text_utils.py      text_utils 单元测试
  ├── test_enrich_filters.py  enrich 过滤逻辑测试
  ├── test_enrich_matchers.py enrich 匹配逻辑测试
  └── cn_models_filtered.json Step 1 中间产物 (gitignore)

scripts/   辅助脚本 (被 pipeline.py 调用)
  ├── diff-ranking.py   两次 ranking.json 的差异报告
  └── README.md

4-final/  前端消费的数据
  ├── ranking.json       活跃模型 (≤180 天 + 变体简化), 前端主用
  ├── ranking_all.json   全量 Large 模型 (含国外旗舰), 历史/方法论用 (gitignore)
  ├── models.json        select_fields.py 产出, 精简版 (独立工具, gitignore)
  ├── models_full.json   select_fields.py 产出, 完整版 (独立工具, gitignore)
  └── report.html        build_report.py 产出, 浏览器可视化报告
```

## 字段与链接规范

### 当前字段契约（2026-07-18 之后）

- `meta.parameters`：优先取总参数量，缺失时用 `active_params_billions` 回填
- `meta.knowledge_cutoff`：新增字段，模型训练知识截止日期（字符串，如 `"2026-01"`）
- `meta.output_tokens`：已移除，详情页不再展示
- `meta.max_output_tokens`：单次响应最大输出 tokens（OR `top_provider.max_completion_tokens`，匹配不到 OR 为 null）
- `flags.tools_calling`：是否支持工具调用（OR `supported_parameters` 含 `tools`；匹配不到 OR 为 null）
- `benchmarks`：透传 `gpqa`/`hle`/`scicode`/`lcr`/`critpt`/`ifbench`/`tau2`/`terminalbench_hard`/`mmmu_pro`/`gdpval`/`livecodebench`/`aime25`（覆盖率 >30% 门槛，`humaneval`/`math_500`/`aime`/`mmlu_pro` 已废弃）；数值保持 AA 原始尺度（多数 0-1 小数，`gdpval` 为绝对分值），格式化在前端展示层处理
- `vendor_links`：仅保留 `homepage`（官方自有官网）和 `console`（模型控制台）。不得放入 HuggingFace/GitHub/试用链接/定价文档链接；官网必须是厂商/模型官方自有域名，不能是第三方聚合站
- `license`：开源模型显示具体 License，闭源模型显示 `"商业授权"`

修改字段时同步更新：
- `build_frontend_models.py` 的 `build_model()`
- `enrich_models.py` 的 `enrich()`
- `../app/src/lib/scoring.ts` 类型定义
- `../app/src/test/fixtures.ts` 与相关单元测试
- `../app/scripts/validate-data.py` 与 `../data/schema/ranking.schema.json`
- 本文档与 `3-process/README.md` 的 schema 段落

### 前端排序规则

`/models` 默认排序：
- 开源模型（`open_weights=true`）→ 按 `openrouter_weekly_tokens` 降序（热度优先）
- 闭源模型 → 按 `scores.intelligence` 降序（智能优先）

### 数据补全入口

详情页对缺失的 `knowledge_cutoff` / `context_window` / `parameters` / `release_date` / `license` 会显示「提交数据补全」按钮，跳转 GitHub Issues 并预填充字段列表。

## 关键架构决策

### 为何 `enrich_models.py` 把所有数据源合并放在最后

抓取阶段（`1-fetch/`）把每个数据源独立产出到 `2-raw/`。富化（Step 3）一次性把它们全部合并进 `ranking_all.json`，原因是：
- AA 用 `short_name`、OpenRouter 用 `slug`、Arena 用 `model` 字段，**没有统一 ID**。`enrich_models.py` 用一组 fuzzy matcher 跨源对齐：
  - `match_or_value`：先精确匹配（direct / normalized exact），再子串匹配（只接受 OR 名 ⊆ 模型名，多候选选最长），避免 Pro/Max 变体价格污染基础版；
  - `match_arena_entries`：显式映射 → 变体聚合 → 精确匹配 → 关键词匹配。
- 国内官价（`cn_pricing`）只有人工维护，自动抓不到。`0-refer/model_reference.json` 是手维护表，富化时按 `company` 注入 `vendor_links`、按 `name` 注入 `cn_pricing`。
- 改名/改字段必看：`enrich_models.py` 里的 `enrich()` 函数是所有外部数据汇入的唯一入口。

### Arena 名称映射的双层机制

Arena 上模型命名差异大（"deepseek-v3.2-exp" vs "DeepSeek V3.2"）：
1. **显式映射**（`arena_name_mapping.json`）：AA 内部名 → Arena 名列表，最高优先级
2. **变体聚合**（`arena_variant_map.json`）：变体 → 父模型，用于让 "DeepSeek V4 Pro (High)" 继承 "DeepSeek V4 Pro (Max)" 的 Arena 排名
3. 兜底：归一化精确匹配 + 末尾 2-3 个关键词子串匹配

所有 Arena 榜单的覆盖统计会打印到终端，但**不会**从输出剔除（即便覆盖率为 0）。

### 变体简化（variant_groups）

`0-refer/model_reference.json` 的 `variant_groups` 键定义了同系列同子组（DeepSeek V4 Pro/Flash、MiMo V2 Pro/Flash、GLM 5.x/4.x 等）的合并规则，由 `enrich_models.py` 启动时读取（`resolve_variant_groups`，缺键时回退代码内置 `DEFAULT_VARIANT_GROUPS` 并告警）。**只在最终的 `ranking.json` 生效**，`ranking_all.json` 保留所有变体。

新增模型变体会撞上重复展示问题，**先看这里**：在 `variant_groups` 对应系列里加上模型名，重跑 Step 3 即可。

### 尺寸+智商过滤（策略 C）

`build_frontend_models.py` 的过滤条件（`main()` 内）从单纯的 `Large / frontier` 二分扩展为**三档任一**：
- `size_class == 'Large'`
- `frontier == True`（AA 标的前沿中等模型）
- `intelligence_index >= 30`（高智商中小模型）

第三档补回**性价比甜点**（如 Qwen3.6 27B、GLM-5-Turbo），但代价是 5 个左右模型缺速度/价格（AA 暂未填）。`data_complete` 标志会标记这些，前端 `data_completeness_pct >= 60` 用于"有效数据"判定。

历史背景：策略 A（纯 Large/frontier）= 51 个；策略 C（+intel≥30）= 73 个；策略 C + 去旧 = **60 个**（当前生产值）。

### 同系列多代去旧（excluded_patterns）

`0-refer/model_reference.json` 的 `excluded_patterns` 键定义跨代黑名单（子串匹配 `short_name`），由 `build_frontend_models.py` 启动时读取（`resolve_excluded_patterns`，缺键时回退代码内置 `DEFAULT_EXCLUDED_PATTERNS` 并告警）：

```json
"excluded_patterns": ["Qwen3.5", "GLM-4"]  // 同系列只保留最新代
```

与 `variant_groups` 的差异：
- `variant_groups`（`enrich_models.py`）：处理**同代内的子变体**（Pro/Flash/Max/High），合并到父模型
- `excluded_patterns`（`build_frontend_models.py`）：处理**跨代版本**（Qwen3.5 vs 3.6），旧代整体黑名单

**新增多代系列时**，往 `excluded_patterns` 加一行即可（如未来要清 Qwen3.4 → 加 `"Qwen3.4"`）。改完重跑 Step 2 + 后续。

### `data_complete` 与数据完整度

`data_complete` 在富化时**覆盖** `build_frontend_models.py` 设置的初始值。

- 国内外统一标准：`intelligence + coding + agentic + speed(median_tps) + pricing` 五者齐全
- `data_completeness_pct`：基于 `validation_config.json` 中 `completeness_fields` 的加权百分比
- 详细逻辑见 `enrich_models.py` 中 `enrich()` 内的 `data_complete` 计算块

### 数据质量验证

`../app/scripts/validate-data.py` 在 `pipeline.py` Phase 5 运行，检查项包括：
- JSON Schema 校验
- 必需字段、intelligence 范围、type 有效性、重复 ID
- 发布日期不能是未来
- 排名一致性、统计量动态阈值、分数分布
- 与上次数据对比（模型数剧变、Top3 剧变、价格突降为 0、intelligence 单日剧变）
- 数据源健康度（coverage）
- **数据源新鲜度**：`2-raw/` 各快照与 `4-final/ranking.json` 的年龄，超过 `warn_days`（默认 3 天）告警、超过 `fail_days`（默认 10 天）判失败
- 异常值检测：中位数 + MAD 的修正 z-score（阈值 3.5），避免合法极端分模型卡死每日管线
- `vendor_links.homepage` 不得指向 HuggingFace/GitHub 等第三方聚合站（告警不阻断）

阈值与新鲜度配置集中在 `0-refer/validation_config.json`（`threshold_defaults` / `history_based_thresholds` / `source_freshness` / `anomaly_detection` / `completeness_fields`），缺配置时脚本回退硬编码默认值。动态阈值基于 `5-history/` 快照计算（`enabled` 可关，测试环境建议关闭以免依赖历史快照）。

### 抓取降级与数据血缘（exit code 3）

三个 fetch 脚本在网络失败但 `2-raw/` 有可用缓存时，会打印降级信息并以 **exit code 3** 退出（区别于正常 0 与硬失败 1）。`pipeline.py` 识别 exit 3：复用缓存继续管线，同时把该数据源标记为 `degraded`。

管线末尾写入 `app/src/data/ranking-meta.json` 数据血缘：每个数据源记录 `{fetched_at, cached, degraded}`，任一源非全新抓取（cached 或 degraded）时顶层 `degraded` 为 true。CI 的 workflow summary（`scripts/generate-workflow-summary.py`）读取该文件展示血缘状态。

### 国内模型识别规则

`cn_classifier.py` 顶部的 `CN_COMPANIES` + `CN_MODEL_NAMES`，只要厂商名或模型名命中任一关键词即归类国内。新增国内厂商需要更新这两个列表。

`flags.chinese_eval` 标记**不**等于"国内模型"，它仅表示该模型在 AA 上跑过中文评测。

### `ranking.json` 字段契约

前端消费的 schema 见 `3-process/README.md` 末尾。**修改字段时同步**：
- `build_frontend_models.py` 的 `build_model()` / `build_flagship_model()`
- `enrich_models.py` 的 `enrich()`（注入逻辑）
- `3-process/README.md`（schema 文档）
- `../app/src/data/` 下前端类型定义

## 重要约定

- 所有脚本用 `python3.11` 触发（项目实测版本）。
- 路径全部用 `Path(__file__).resolve()` 推导，不要写死绝对路径，这样从任意目录调用脚本都可以。
- `2-raw/` 是只读缓存：手编辑会被下次 `1-fetch/` 抓取覆盖，**所有人工修正应当落到 `0-refer/`**。
- `flagship_top3.json` 已废弃（见 2-raw/ 目录树注释），文件保留供历史参考；不要在管线里再读它。国际 Large 旗舰现在直接由 `build_frontend_models.py` 从 `aa_all_full.json` 提取。
- 修改 About 页面"榜单筛选"文案时，需和 `app/CLAUDE.md` 数据管线段对齐：3 步处理 = 构建前端 → 富化+切活跃 → 报告。
- 抓取脚本网络失败会非零退出（exit 1 硬失败 / exit 3 降级复用缓存，见「抓取降级与数据血缘」），主管线（Step 1-3）每一步都默认 `2-raw/` 已就绪，**抓取和处理是解耦的**。`pipeline.py` 内置 6h 缓存策略自动判断是否重抓。

## 调试线索

- AA 字段含义查不准：`1-fetch/aa_data_extraction.md`（AA 全字段定义 + 覆盖率统计）
- OR / Arena 匹配不上：在 `enrich_models.py` 的 `match_or_value` / `match_arena_entries` 加 print，查看 `name_norm` vs `or_norm`/`arena_norm` 的具体形态；OR 子串匹配只接受 OR 名 ⊆ 模型名（防止反向匹配），多候选时选最长；Arena 多数情况补一个 `arena_name_mapping.json` 条目即可
- 模型莫名消失：检查 `release_date` 是否超 180 天（被 `filter_by_date` 过滤），被 `variant_groups` 合并掉（`0-refer/model_reference.json`），或被 `excluded_patterns` 黑名单（同文件）整代排除
- 富化后 `cn_pricing` 仍为 null：`model_reference.json` 的 `cn_pricing` 键必须**精确等于** AA `short_name`（区分大小写、空格），没有 fuzzy 匹配
- `pipeline.py` 验证阶段失败：看 Phase 5 中哪个子步骤（test/build/lint/validate-data）先退出，针对性修
