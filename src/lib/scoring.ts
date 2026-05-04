import modelsRaw from "@/data/ranking.json";

// ── Types ──
interface RawModel {
  id: string;
  name: string;
  company: string;
  type: string;
  logo: string;
  url: string;
  scores: {
    intelligence: number;
    coding: number | null;
    agentic: number | null;
  };
  speed?: {
    median_tps: number | null;
    ttft_seconds: number | null;
    e2e_seconds: number | null;
  };
  pricing?: {
    input: number | null;
    output: number | null;
    display: string;
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
    source: string;
  } | null;
  flags: {
    frontier: boolean;
    open_weights: boolean;
    reasoning: boolean;
    image_input: boolean;
    chinese_eval: boolean;
    has_speed: boolean;
    data_complete: boolean;
  };
  openrouter_weekly_tokens?: number | null;
  openrouter_pricing?: { prompt: number; completion: number } | null;
  meta?: {
    context_window: number | null;
    parameters: number | null;
    output_tokens: number | null;
    release_date: string | null;
    omniscience: number | null;
  };
}

export interface ModelWithScores {
  id: string;
  name: string;
  company: string;
  type: "开源" | "闭源";
  logo: string;
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
    median_tps: number | null;
    ttft_seconds: number | null;
    e2e_seconds: number | null;
    input: number | null;
    output: number | null;
    display: string;
    cn_input: number | null;
    cn_output: number | null;
    cn_display: string | null;
    context_window: number | null;
    parameters: number | null;
    output_tokens: number | null;
    release_date: string | null;
    omniscience: number | null;
    openrouter_weekly_tokens: number | null;
    openrouter_pricing: { prompt: number; completion: number } | null;
  };

  flags: {
    frontier: boolean;
    open_weights: boolean;
    reasoning: boolean;
    image_input: boolean;
    chinese_eval: boolean;
    has_speed: boolean;
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
    // 上游 ranking.json 用 median_tps === 0 表示无 speed 数据
    const speedMissing = !m.speed || m.speed.median_tps === 0;
    return {
      id: m.id,
      name: m.name,
      company: m.company,
      type: m.type as "开源" | "闭源",
      logo: m.logo,
      url: m.url,
      vendor_links: m.vendor_links,
      raw: {
        intelligence: m.scores.intelligence,
        coding: m.scores.coding ?? null,
        agentic: m.scores.agentic ?? null,
        median_tps: speedMissing ? null : m.speed!.median_tps,
        ttft_seconds: speedMissing ? null : m.speed!.ttft_seconds,
        e2e_seconds: speedMissing ? null : m.speed!.e2e_seconds,
        input: m.pricing?.input ?? null,
        output: m.pricing?.output ?? null,
        display: m.pricing?.display ?? "",
        cn_input: cn?.input ?? null,
        cn_output: cn?.output ?? null,
        cn_display: cn ? `¥${cn.input}/¥${cn.output}` : null,
        context_window: m.meta?.context_window ?? null,
        parameters: m.meta?.parameters ?? null,
        output_tokens: m.meta?.output_tokens ?? null,
        release_date: m.meta?.release_date ?? null,
        omniscience: m.meta?.omniscience ?? null,
        openrouter_weekly_tokens: m.openrouter_weekly_tokens ?? null,
        openrouter_pricing: m.openrouter_pricing ?? null,
      },
      flags: m.flags,
    };
  });

  _cache = { models, byId: new Map(models.map((m) => [m.id, m])) };
}

// ── Public API ──

/** 返回 data_complete 的模型，供排名页使用 */
export function getAllModels(): ModelWithScores[] {
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
