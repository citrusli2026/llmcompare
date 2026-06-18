---
name: fetch-aa-data
description: Crawl Artificial Analysis models page to extract full model data (72 fields × 512 models). Uses RSC header trick to get Next.js serialized payload, then parses JSON. Outputs aa_all_full.json and aa_top64_full.json.
version: 1.0.0
metadata:
  hermes:
    tags: [data-collection, rankings, leaderboard, aa]
---

# Fetch Artificial Analysis Model Data

## Overview

Downloads the RSC (React Server Components) payload from https://artificialanalysis.ai/models and parses all 512 models with 72 fields each, including intelligence/coding/agentic indices, speed, latency, benchmarks, pricing, specs, and modality support.

## Quick Start

```bash
cd data/1-fetch
python3 fetch_aa_data.py --output ../2-raw/
```

Options:
- `--keep-rsc`: preserve raw 7MB RSC payload for debugging
- `--output DIR`: output directory (default: current dir)

## Output Files

- `aa_all_full.json` — All ~512 models, sorted by intelligence_index desc
- `aa_top64_full.json` — Top 64 only

## When to Use

- User asks to refresh/update AA model rankings
- New models released and need latest data
- Weekly/monthly data refresh

## Fields Extracted (72 total)

**Indices**: intelligence_index, coding_index, agentic_index, omniscience  
**Benchmarks**: gpqa, aime, aime25, hle, mmlu_pro, livecodebench, math_500, mmmu_pro, scicode, ifbench, humaneval, critpt, lcr, tau2, terminalbench_hard, gdpval  
**Speed**: speed_median_tps, speed_p05/p95, speed_short/medium/long  
**Latency**: ttft_seconds, e2e_total/answer/reasoning_seconds  
**Pricing**: price_input, price_output, price_blended ($/M tokens)  
**Specs**: context_window, parameters, active_params_billions, size_class, output_tokens  
**Modality**: input/output text/image/audio/video  
**Tags**: reasoning, open_weights, open_source_category, license, frontier, release_date  

## Data Flow

1. `curl -H "RSC: 1" https://artificialanalysis.ai/models` → 7.4MB RSC payload
2. Regex find `{"additional_text":` → extract balanced JSON objects
3. Parse each object → extract 72 fields with safe_dict() guards
4. Sort by intelligence_index desc → save JSON

## Pitfalls

- Some nested fields are `"$undefined"` string instead of dict; use `safe_dict()`
- Speed data null/zero for free/unreleased models
- `aime`, `humaneval`, `math_500` deprecated on new models
- `speed_short_tps` absent in Top64 (only in `performanceByPromptLength`)

## Reference

Full documentation: `1-fetch/aa_data_extraction.md`

## Environment Requirements

- **Python 3.6+** (仅依赖标准库)
- Output goes to `2-raw/` by default; use `--output` to override
