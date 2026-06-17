# 数据处理管线

```sh
2-raw/aa_all_full.json  (AA 全量模型)
        │
        ▼
┌─────────────────────────────────┐
│ Step 1: build_frontend_models.py│  构建前端数据模型
│  构建: 字段翻译/格式统一/类型推断  │
│  过滤: Large / frontier / intel≥30 │  (策略 C: 补回高智商中小模型)
│  去旧: EXCLUDED_PATTERNS 黑名单   │  (Qwen3.5 / GLM-4 等跨代清理)
│  (评分/分层/归一化 → 前端 scoring.ts)│
│  输入: ../2-raw/aa_all_full.json │
│  输出: ../4-final/ranking_all.json│  (全量 Large + 前沿 Medium + 策略C中小模型)
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ Step 2: enrich_models.py        │  数据富化 + 活跃筛选
│  合并: 0-refer/model_reference.json │  (厂商链接 + 国内官价)
│       2-raw/or_models_full.json  │  (OR 调用量)
│       2-raw/or_models.json       │  (OR 定价)
│       2-raw/arena_leaderboards.json│ (Arena 排名)
│       0-refer/arena_name_mapping.json │ (显式映射)
│       0-refer/arena_variant_map.json  │ (变体聚合)
│  处理: 注入数据 → 覆盖率检查 → 日期筛选 → 变体简化
│  输入: ../4-final/ranking_all.json│
│  输出: ../4-final/ranking_all.json│  (原地更新, 全量富化)
│        ../4-final/ranking.json   │  (活跃模型, ≤180 天)
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ Step 3: build_report.py         │  可视化报告
│  构建: HTML 报告 + 终端文本摘要   │
│  输入: ../4-final/ranking.json   │
│  输出: ../4-final/report.html    │  (浏览器打开)
│        + 终端文本摘要             │
└─────────────────────────────────┘
```

报告内容: 数据仪表盘 · Top 排行榜 · Frontier 对比卡片 · 数据质量 · 厂商分布

## 用法

```bash
cd data/3-process
python3.11 build_frontend_models.py  # Step 1: 构建前端模型（过滤: Large/frontier/intel≥30 + 去旧）
python3.11 enrich_models.py          # Step 2: 富化 + 筛选活跃模型
python3.11 build_report.py           # Step 3: 生成可视化报告
```

> `filter_cn_models.py` 已从主管线移除，仅保留为独立诊断工具。
> `build_frontend_models.py` 现在直接从 `2-raw/aa_all_full.json` 读取全量 AA 数据，不再需要前置的国内筛选步骤。

## 评分与分层

评分计算（归一化、综合分、性价比）和 tier 分层（frontier/active/legacy/outdated）
由前端 `scoring.ts` 负责，不在 Python 管线中处理。
Python 管线只做字段翻译和格式统一，输出 AA 原始数据给前端。

## 变体简化规则

同系列同子组（如 Pro/Flash）只保留智能分最高的版本，避免前端展示重复模型。

当前定义的简化组 (`VARIANT_GROUPS`):
- DeepSeek V4: Pro (Max/High) / Flash (Max/High)
- MiMo V2: Pro / Flash
- GLM: 5.x / 4.x
- MiniMax M2: M2
- Qwen3.6: 3.6
- DeepSeek V3.2: V3.2

简化在日期筛选之后执行，仅影响 `ranking.json` 活跃模型列表。

## 尺寸过滤与同代去旧

`build_frontend_models.py` 在 Step 2 入口处做两轮过滤：

**1. 尺寸+智商过滤（三档任一）**：
- `size_class == 'Large'`
- `frontier == True`
- `intelligence_index >= 30`

第三档用于收录 Qwen3.6 27B、GLM-5-Turbo 这类高性价比中小旗舰。代价是 5 个左右模型缺速度/价格数据（`data_complete=false` 标记），前端用 `data_completeness_pct >= 60` 区分"有效数据"。

**2. 同系列多代去旧（EXCLUDED_PATTERNS 黑名单）**：

```python
EXCLUDED_PATTERNS = ['Qwen3.5', 'GLM-4']
```

子串匹配 `short_name` 排除整代旧版，避免前端展示"Qwen3.5 27B + Qwen3.6 27B"这种跨代并存。

与 `VARIANT_GROUPS` 的差异：
- `EXCLUDED_PATTERNS`：**跨代**整体黑名单（按版本号前缀）
- `VARIANT_GROUPS`：**同代内**子变体合并（按子型号 Pro/Flash）

新增多代系列时，往 `EXCLUDED_PATTERNS` 追加一行（如未来清 Qwen3.4 → 加 `'Qwen3.4'`），重跑 Step 2 起。

## 输出: ranking.json 字段说明

```typescript
interface Model {
  id: string;              // URL-safe ID, 如 "kimi-k2-6"
  name: string;            // 显示名
  company: string;         // 厂商
  type: "开源" | "闭源";    // 推断自 open_weights
  logo: string;            // logo 路径
  rank: number;            // 按 AA intelligence 降序排列

  scores: {
    intelligence: number;  // AA Intelligence Index (0-60+)
    coding: number|null;   // AA Coding Index
    agentic: number|null;  // AA Agentic Index
  };

  speed: {                 // AA 原始速度数据 (前端需自行归一化)
    median_tps: number|null;
    ttft_seconds: number|null;   // 首 Token 延迟
    e2e_seconds: number|null;    // 端到端延迟
  };

  pricing: {
    input: number|null;    // $/M tokens (AA 原始)
    output: number|null;
    blended: number|null;  // 混合价
    display: string;       // 前端展示, 优先使用 ¥ 官价, 如 "¥6.5/¥27.0 (缓存命中¥1.1)"
    cn_source?: string;    // 官价来源, 如 "platform.kimi.com"
  };

  // === enrich_models.py 注入 (Step 3) ===
  vendor_links?: {          // 厂商链接
    homepage?: string;
    api_docs?: string;
    console?: string;
    github?: string;
    huggingface?: string;
    pricing_doc?: string;   // 定价页链接
  };

  cn_pricing?: {            // 国内官价 (来自 0-refer/model_reference.json)
    input: number;          // ¥/百万 tokens
    output: number;
    cache_hit?: number;     // 缓存命中价
    currency?: string;      // 默认 "¥"
    condition?: string;     // 如 "≤32K"
    source: string;         // 定价来源
  } | null;

  openrouter_weekly_tokens?: number;  // OpenRouter 周调用量 (tokens)
  openrouter_pricing?: {             // OpenRouter 平台定价
    prompt: number;                   // $/百万 tokens
    completion: number;
  };

  arena_rankings?: {        // LMSYS Arena 榜单排名
    [leaderboard: string]: {
      rank: number;
      score: number;
      votes?: number;
    }
  };

  flags: {
    frontier: boolean;
    open_weights: boolean;
    reasoning: boolean;
    image_input: boolean;
    chinese_eval: boolean;
    has_speed: boolean;
    has_pricing: boolean;
    data_complete: boolean; // intelligence + coding + agentic + speed(>0) + pricing 五者齐全
  };

  meta: {
    context_window: number;
    size_class: string;
    release_date: string;
    omniscience: number|null; // AA 幻觉控制分 (越低越好, -10≈极少幻觉, -89≈严重幻觉)
  };

  url: string;             // AA 详情页
}
```
