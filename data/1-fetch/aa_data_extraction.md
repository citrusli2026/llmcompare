# Artificial Analysis 数据抓取文档

## 概述

从 https://artificialanalysis.ai/models 抓取 AI 模型全维度数据，生成结构化 JSON。

- **数据源**: Artificial Analysis (Next.js SPA)
- **提取方法**: RSC Header Trick (React Server Components 序列化)
- **模型总数**: ~512 个 (含 provider 变体)
- **字段数**: 72 个
- **更新频率**: 按需 / 网站更新后
- **输出文件**:
  - `aa_top64_full.json` — Intelligence Index 前 64 名，全字段
  - `aa_all_full.json` — 全部 512 模型，全字段

## 抓取方法

### 原理

Artificial Analysis 是 Next.js App Router SPA。普通 HTTP 请求返回 4-5MB 的空 HTML 壳。加上 `RSC: 1` 请求头触发 React Server Components 的序列化路径，返回约 600KB-7MB 的 `text/x-component` 载荷，其中包含实际渲染数据和内嵌 JSON。

### 步骤

**1. 获取 RSC 载荷**

```bash
curl -sL --max-time 120 \
  -H "RSC: 1" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  "https://artificialanalysis.ai/models" \
  -o aa_models_rsc.txt
```

- 根路径 `/` 返回 ~600KB (仅首页 highlights)
- `/models` 路径返回 ~7.4MB (完整模型表格数据)
- 超时设置 120s，7MB 通常在 10-30s 内完成

**2. 解析模型对象**

载荷是 RSC 序列化格式，模型数据嵌套在深度 JSON 中。提取逻辑：

```python
import re, json

# 每个模型对象以 {"additional_text": 开头
model_starts = [m.start() for m in re.finditer(r'\{"additional_text":', content)]

def extract_json_object(text, start):
    """括号平衡匹配提取完整 JSON 对象"""
    depth = 0
    in_string = False
    escape = False
    i = start
    while i < len(text):
        ch = text[i]
        if escape:
            escape = False
            i += 1
            continue
        if ch == '\\':
            escape = True
        elif ch == '"':
            in_string = not in_string
        elif not in_string:
            if ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return text[start:i+1]
        i += 1
    return None
```

**3. 嵌套字段安全提取**

很多字段可能是 `"$undefined"` 字符串而非对象，需要 `safe_dict()` 防护：

```python
def safe_dict(val):
    return val if isinstance(val, dict) else {}
```

## 字段说明

### 身份标识 (Identity)
| 字段 | 类型 | 说明 |
|------|------|------|
| short_name | string | 模型显示名称，如 "GPT-5.5 (xhigh)" |
| company | string | 厂商名称，来自 model_creators.name |
| slug | string | URL slug |
| model_url | string | 完整 URL `https://artificialanalysis.ai/models/xxx` |
| logo | string | logo 图片路径 |
| color | string | 品牌色 hex |
| release_date | string | 发布日期 YYYY-MM-DD |

### 核心指数 (Main Indices)
| 字段 | 类型 | 范围 | 说明 |
|------|------|------|------|
| intelligence_index | float | 0-100 | AA 综合智能指数 |
| coding_index | float | 0-100 | 编程能力指数（**2026-08 AA 已移除 codingIndex 字段**，缺失时取 Terminal-Bench v2.1 原始得分 ×100，带 `coding_index_estimated=True` 标记）|
| agentic_index | float | 0-100 | Agent 能力指数 |
| math_index | float | 0-100 | 数学能力指数（仅部分模型，**当前管线不提取该字段**）|
| omniscience | float | -100~100 | 幻觉率评分，越高越好（负数表示幻觉严重）|

### 基准测试 (Benchmarks) — 14项
| 字段 | 范围 | 说明 |
|------|------|------|
| gpqa | 0-1 | GPQA Diamond 研究生级问答 |
| aime | 0-1 | AIME 数学竞赛（旧版） |
| aime25 | 0-1 | AIME 2025 数学竞赛 |
| hle | 0-1 | Humanity's Last Exam |
| mmlu_pro | 0-1 | MMLU-Pro 多任务语言理解 |
| livecodebench | 0-1 | LiveCodeBench 代码生成 |
| math_500 | 0-1 | MATH-500 |
| mmmu_pro | 0-1 | MMMU-Pro 多模态理解 |
| scicode | 0-1 | SciCode 科学计算 |
| ifbench | 0-1 | IFBench 指令遵循 |
| humaneval | 0-1 | HumanEval 代码 |
| critpt | 0-1 | CritPt |
| lcr | 0-1 | LCR |
| tau2 | 0-1 | τ²-Bench |
| terminalbench_hard | 0-1 | Terminal-Bench Hard |
| gdpval | float | GDPval-AA 综合评分 |

**注意**: 大部分模型仅包含 gpqa, hle, scicode, ifbench, critpt, lcr, tau2, terminalbench_hard（核心8项）。aime, mmlu_pro, math_500, humaneval 仅在旧模型上出现。

### 价格 (Pricing) — 单位: $/M tokens
| 字段 | 类型 | 说明 |
|------|------|------|
| price_input | float | 输入价格 |
| price_output | float | 输出价格 |
| price_blended | float | 混合价格 (输入:输出=3:1) |
| index_compute | float | 评测总算力消耗 |
| index_tokens_total | int | 评测总 token 消耗 |

### 速度 (Speed) — 来自 timescaleData
| 字段 | 类型 | 单位 | 说明 |
|------|------|------|------|
| speed_median_tps | float | tokens/s | 中位输出速度 |
| speed_p05_tps | float | tokens/s | P05 百分位速度 |
| speed_p95_tps | float | tokens/s | P95 百分位速度 |
| speed_short_tps | float | tokens/s | 短 prompt 速度 (仅部分模型) |
| speed_medium_tps | float | tokens/s | 中 prompt 速度 |
| speed_long_tps | float | tokens/s | 长 prompt 速度 |

### 延迟 (Latency) — 来自 end_to_end_response_time_metrics
| 字段 | 类型 | 单位 | 说明 |
|------|------|------|------|
| ttft_seconds | float | 秒 | Time-To-First-Token（来自 time_to_first_answer_token_metrics.total_time）|
| e2e_total_seconds | float | 秒 | 端到端总延迟 |
| e2e_answer_seconds | float | 秒 | 答案生成耗时 |
| e2e_reasoning_seconds | float | 秒 | 推理/思考耗时（reasoning 模型）|

### 规格 (Specs)
| 字段 | 类型 | 说明 |
|------|------|------|
| context_window | string | 格式化上下文窗口 "1m", "256k", "922k" |
| context_window_tokens | int | 上下文字数 |
| parameters | float | 总参数量（仅开源模型） |
| active_params_billions | float | 激活参数量 (B) |
| size_class | string | 体积级别 "Large", "Medium", "Small" |
| output_tokens | int | 最大输出 tokens |

### 模态支持 (Modality)
| 字段 | 类型 | 说明 |
|------|------|------|
| input_text | bool | 文本输入 |
| input_image | bool | 图像输入 |
| input_audio | bool | 语音输入 |
| input_video | bool | 视频输入 |
| output_text | bool | 文本输出 |
| output_image | bool | 图像输出 |
| output_audio | bool | 语音输出 |
| output_video | bool | 视频输出 |

### 标签与许可 (Tags & License)
| 字段 | 类型 | 说明 |
|------|------|------|
| reasoning | bool | 是否推理模型 |
| open_weights | bool | 是否开源权重 |
| open_source_category | string | 开源分类 |
| commercial_allowed | bool | 是否允许商用 |
| license | string | 许可证名称 |
| frontier | bool | 是否前沿模型 |
| knowledge_cutoff | string | 知识截止日期 |

### 评测成本 (Eval Cost)
| 字段 | 类型 | 说明 |
|------|------|------|
| eval_input_cost | float | 评测输入成本 |
| eval_output_cost | float | 评测输出成本 |
| eval_total_cost | float | 评测总成本 |
| eval_input_tokens | int | 评测输入 tokens |
| eval_output_tokens | int | 评测输出 tokens |

## 数据覆盖情况 (Top 64)

| 覆盖率 | 字段 |
|--------|------|
| 64/64 (100%) | short_name, company, intelligence_index, coding_index, gpqa, hle, scicode, ifbench, critpt, lcr, tau2, terminalbench_hard, price_*, speed_median/p05/p95, ttft, e2e_*, context_window, input_text/image, output_text, reasoning, open_weights, open_source_category, eval_* |
| 57-63/64 | agentic_index, omniscience, gdpval, speed_medium/long, output_tokens, input/output_audio/video, frontier, eval_* |
| 15-45/64 | math_index, aime25, mmlu_pro, livecodebench, mmmu_pro |
| 0-19/64 | aime, humaneval, math_500, parameters, active_params_billions, knowledge_cutoff |

## 注意事项

1. **RSC 载荷过期**: 网站更新后 RSC chunk 文件名可能变化，但 JSON 结构通常稳定
2. **嵌套字段不确定性**: `model_creators`、`timescaleData`、`omniscience_breakdown` 等可能为 `null`、`"$undefined"` 或空对象
3. **速度数据缺失**: 免费/开源模型 (如 Muse Spark) 的 timescaleData 可能全为 null/0
4. **重复模型**: 同一基础模型的不同推理 effort (low/medium/high/xhigh/max) 和不同 provider 算作独立条目
5. **字段淘汰**: `aime`(旧版)、`humaneval`、`math_500` 在新模型上已不评测，为 null
6. **速度短 prompt**: `speed_short_tps` 在 Top64 中完全缺失，数据仅在 performanceByPromptLength 的 "short" 类型中存在
7. **前端消费字段**: 当前 `ranking.json` 仅保留 `gpqa` / `hle` 两个 benchmark 分数，`mmlu_pro` 已从前端移除；`output_tokens` 不再展示，详情页改用 `knowledge_cutoff` 表示知识截止日期

## 完整抓取脚本

见 `fetch_aa_data.py`（同目录）

> ⚠️ 运行要求: **Python 3.6+**（仅依赖标准库）。
> 
> ```bash
> python3 fetch_aa_data.py --output ../2-raw/
> ```

---

*最后更新: 2026-05-02*
