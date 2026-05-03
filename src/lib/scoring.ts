import modelsRaw from "@/data/ranking.json";

// ── Types ──
interface RawModel {
  id: string;
  name: string;
  company: string;
  type: string;
  logo: string;
  rank: number;
  url: string;
  scores: {
    intelligence: number;
    coding: number | null;
    agentic: number | null;
    math: number | null;
  };
  speed?: {
    median_tps: number | null;
    ttft_seconds: number | null;
    e2e_seconds: number | null;
  };
  pricing?: {
    input: number | null;
    output: number | null;
    blended: number | null;
    display: string;
    cn_source?: string;
  };
  vendor_links?: {
    homepage?: string;
    api_docs?: string;
    console?: string;
    huggingface?: string;
    pricing_doc?: string;
  };
  cn_pricing?: {
    input: number;
    output: number;
    cache_hit?: number;
    source: string;
  } | null;
  flags: {
    frontier: boolean;
    open_weights: boolean;
    reasoning: boolean;
    image_input: boolean;
    chinese_eval: boolean;
    has_speed: boolean;
    has_pricing: boolean;
    data_complete: boolean;
  };
  meta?: {
    context_window: number | null;
    size_class: string | null;
    release_date: string | null;
    omniscience: number | null;
  };
}

export type PriorityMode = "intelligence" | "cost" | "speed" | "balanced";

export const MODE_WEIGHTS: Record<PriorityMode, { intelligence: number; speed: number; cost: number }> = {
  intelligence: { intelligence: 0.6, speed: 0.15, cost: 0.25 },
  cost: { intelligence: 0.3, speed: 0.15, cost: 0.55 },
  speed: { intelligence: 0.2, speed: 0.55, cost: 0.25 },
  balanced: { intelligence: 0.8, speed: 0.1, cost: 0.1 },
};

// Data source metadata per column
// labelKey/sourceKey use i18n keys; label/source are fallbacks when key is undefined
export const DATA_SOURCES = {
  intelligence: {
    labelKey: "source.intelligenceLabel",
    sourceKey: "source.intelligenceSource",
    url: "https://artificialanalysis.ai/intelligence",
  },
  coding: {
    labelKey: "source.codingLabel",
    sourceKey: "source.codingSource",
    url: "https://artificialanalysis.ai",
  },
  agentic: {
    labelKey: "source.agenticLabel",
    sourceKey: "source.agenticSource",
    url: "https://artificialanalysis.ai",
  },
  math: {
    labelKey: "source.mathLabel",
    sourceKey: "source.mathSource",
    url: "https://artificialanalysis.ai",
  },
  speed: {
    labelKey: "source.speedLabel",
    sourceKey: "source.speedSource",
    url: "https://artificialanalysis.ai",
  },
  cost: {
    labelKey: "source.costLabel",
    sourceKey: "source.costSource",
    url: "https://artificialanalysis.ai",
  },
} as const;

export interface ModelWithScores {
  id: string;
  name: string;
  company: string;
  type: "开源" | "闭源";
  logo: string;
  rank: number;
  url: string;

  vendor_links?: {
    homepage?: string;
    api_docs?: string;
    console?: string;
    huggingface?: string;
    pricing_doc?: string;
  };

  // Raw values directly from data sources
  raw: {
    intelligence: number;
    coding: number | null;
    agentic: number | null;
    math: number | null;
    median_tps: number | null;
    ttft_seconds: number | null;
    e2e_seconds: number | null;
    blended: number | null;
    input: number | null;
    output: number | null;
    display: string;
    cn_input: number | null;
    cn_output: number | null;
    cn_display: string | null;
    context_window: number | null;
    size_class: string | null;
    release_date: string | null;
    omniscience: number | null;
  };

  flags: {
    frontier: boolean;
    open_weights: boolean;
    reasoning: boolean;
    image_input: boolean;
    chinese_eval: boolean;
    has_speed: boolean;
    has_pricing: boolean;
    data_complete: boolean;
  };
}

// ── Cache ──
let _cache: {
  models: ModelWithScores[];
  byId: Map<string, ModelWithScores>;
} | null = null;

function initCache(): void {
  if (_cache) return;

  const models: ModelWithScores[] = modelsRaw.map((m: RawModel) => {
    const cn = m.cn_pricing;
    const speedMissing = !m.speed || m.speed.median_tps === 0;
    return {
      id: m.id,
      name: m.name,
      company: m.company,
      type: m.type as "开源" | "闭源",
      logo: m.logo,
      rank: m.rank,
      url: m.url,
      vendor_links: m.vendor_links,
      raw: {
        intelligence: m.scores.intelligence,
        coding: m.scores.coding ?? null,
        agentic: m.scores.agentic ?? null,
        math: m.scores.math ?? null,
        median_tps: speedMissing ? null : m.speed!.median_tps,
        ttft_seconds: speedMissing ? null : m.speed!.ttft_seconds,
        e2e_seconds: speedMissing ? null : m.speed!.e2e_seconds,
        blended: m.pricing?.blended ?? null,
        input: m.pricing?.input ?? null,
        output: m.pricing?.output ?? null,
        display: m.pricing?.display ?? "",
        cn_input: cn?.input ?? null,
        cn_output: cn?.output ?? null,
        cn_display: cn ? `¥${cn.input}/¥${cn.output}` : null,
        context_window: m.meta?.context_window ?? null,
        size_class: m.meta?.size_class ?? null,
        release_date: m.meta?.release_date ?? null,
        omniscience: m.meta?.omniscience ?? null,
      },
      flags: m.flags,
    };
  });

  _cache = { models, byId: new Map(models.map((m) => [m.id, m])) };
}

// ── Public API ──

/** 返回 data_complete 的模型，供排名页使用 */
export function getAllModels(_mode: PriorityMode = "balanced"): ModelWithScores[] {
  initCache();
  return _cache!.models.filter((m) => m.flags.data_complete);
}

/** 返回全量模型（包含 data_complete=false），供静态路径生成和详情页使用 */
export function getAllModelsUnfiltered(): ModelWithScores[] {
  initCache();
  return _cache!.models;
}

export function getModelById(id: string): ModelWithScores | undefined {
  initCache();
  return _cache!.byId.get(id);
}

export function calculateMonthlyCost(
  dailyInputTokensMillion: number,
  dailyOutputTokensMillion: number,
  inputPrice: number | null,
  outputPrice: number | null
): number | null {
  if (inputPrice == null && outputPrice == null) return null;
  const dailyCost = (dailyInputTokensMillion * (inputPrice ?? 0)) + (dailyOutputTokensMillion * (outputPrice ?? 0));
  return Math.round(dailyCost * 30);
}
