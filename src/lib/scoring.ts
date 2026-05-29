import modelsRaw from "@/data/ranking.json";

// ── Shared Types ──
interface VendorLinks {
  homepage?: string;
  api_docs?: string;
  console?: string;
  huggingface?: string;
  github?: string;
  pricing_doc?: string;
}

interface ModelFlags {
  frontier: boolean;
  open_weights: boolean;
  reasoning: boolean;
  image_input: boolean;
  chinese_eval: boolean;
  has_speed: boolean;
  data_complete: boolean;
}

interface ArenaRanking {
  rank: number;
  score: number;
  votes?: number;
}

interface RawScores {
  intelligence: number;
  coding: number | null;
  agentic: number | null;
}

interface RawSpeed {
  median_tps: number | null;
  ttft_seconds: number | null;
  e2e_seconds: number | null;
}

interface RawPricing {
  input: number | null;
  output: number | null;
  display: string;
}

interface RawMeta {
  context_window: number | null;
  parameters: number | null;
  output_tokens: number | null;
  release_date: string | null;
  omniscience: number | null;
}

// ── RawModel (from JSON) ──
interface RawModel {
  id: string;
  name: string;
  company: string;
  type: string;
  logo: string;
  url: string;
  scores: RawScores;
  speed?: RawSpeed;
  pricing?: RawPricing;
  vendor_links?: VendorLinks;
  cn_pricing?: {
    input: number;
    output: number;
    source: string;
  } | null;
  flags: ModelFlags;
  arena_votes?: number | null;
  openrouter_pricing?: { prompt: number; completion: number } | null;
  arena_rankings?: Record<string, ArenaRanking | undefined> | null;
  meta?: RawMeta;
}

// ── Public Types ──
export interface ModelWithScores {
  id: string;
  name: string;
  company: string;
  type: "开源" | "闭源";
  logo: string;
  url: string;
  vendor_links?: VendorLinks;

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
    isInternational: boolean;
    context_window: number | null;
    parameters: number | null;
    output_tokens: number | null;
    release_date: string | null;
    omniscience: number | null;
    arena_votes: number | null;
    openrouter_pricing: { prompt: number; completion: number } | null;
    arena_rankings: Record<string, ArenaRanking | undefined> | null;
    arena_code: number | null;
    data_completeness_pct: number;
  };

  flags: ModelFlags;
}

// ── Cache ──
let _cache: {
  models: ModelWithScores[];
  byId: Map<string, ModelWithScores>;
} | null = null;

function initCache(): void {
  if (_cache) return;

  const models: ModelWithScores[] = (modelsRaw as RawModel[]).map((m) => {
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
        isInternational: !m.flags.chinese_eval,
        context_window: m.meta?.context_window ?? null,
        parameters: m.meta?.parameters ?? null,
        output_tokens: m.meta?.output_tokens ?? null,
        release_date: m.meta?.release_date ?? null,
        omniscience: m.meta?.omniscience ?? null,
        arena_votes: m.arena_votes ?? null,
        openrouter_pricing: m.openrouter_pricing ?? null,
        arena_rankings: m.arena_rankings && Object.keys(m.arena_rankings).length > 0 ? m.arena_rankings : null,
        arena_code: m.arena_rankings?.code?.score ?? null,
        data_completeness_pct: ((m as unknown) as Record<string, unknown>).data_completeness_pct as number ?? 0,
      },
      flags: m.flags,
    };
  });

  _cache = { models, byId: new Map(models.map((m) => [m.id, m])) };
}

// ── Public API ──

/** 返回全量模型（data_complete 仅标记，不做筛选） */
export function getAllModels(): ModelWithScores[] {
  initCache();
  return _cache!.models;
}

/** 返回全量模型（同 getAllModels，保留兼容） */
export function getAllModelsUnfiltered(): ModelWithScores[] {
  initCache();
  return _cache!.models;
}

export function getModelById(id: string): ModelWithScores | undefined {
  initCache();
  return _cache!.byId.get(id);
}
