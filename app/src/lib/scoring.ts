import modelsRaw from "@/data/ranking.json";

// ── Shared Types ──
interface VendorLinks {
  homepage?: string;
  console?: string;
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
  p05_tps: number | null;
  p95_tps: number | null;
}

interface RawPricing {
  input: number | null;
  output: number | null;
  blended: number | null;
  display: string;
}

interface RawBenchmarks {
  gpqa: number | null;
  hle: number | null;
}

interface RawMeta {
  context_window: number | null;
  parameters: number | null;
  release_date: string | null;
  knowledge_cutoff: string | null;
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
  benchmarks?: RawBenchmarks;
  vendor_links?: VendorLinks;
  cn_pricing?: {
    input: number;
    output: number;
    source: string;
  } | null;
  flags: ModelFlags;
  arena_votes?: number | null;
  openrouter_weekly_tokens?: number | null;
  openrouter_pricing?: { prompt: number; completion: number } | null;
  arena_rankings?: Record<string, ArenaRanking | undefined> | null;
  data_completeness_pct?: number;
  meta?: RawMeta;
  license?: string | null;
}

// ── Model Type Constants ──
// JSON data uses Chinese strings; map once here so all consumers use constants.
export const ModelType = { Open: "开源", Closed: "闭源" } as const;
export type ModelTypeValue = (typeof ModelType)[keyof typeof ModelType];

// ── Public Types ──
export interface ModelWithScores {
  id: string;
  name: string;
  company: string;
  type: ModelTypeValue;
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
    p05_tps: number | null;
    p95_tps: number | null;
    input: number | null;
    output: number | null;
    blended: number | null;
    display: string;
    cn_input: number | null;
    cn_output: number | null;
    cn_display: string | null;
    isInternational: boolean;
    context_window: number | null;
    parameters: number | null;
    release_date: string | null;
    knowledge_cutoff: string | null;
    omniscience: number | null;
    arena_votes: number | null;
    openrouter_weekly_tokens: number | null;
    openrouter_pricing: { prompt: number; completion: number } | null;
    arena_rankings: Record<string, ArenaRanking | undefined> | null;
    arena_code: number | null;
    data_completeness_pct: number;
    license: string | null;
    benchmarks: {
      gpqa: number | null;
      hle: number | null;
    };
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
      type: m.type as ModelTypeValue,
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
        p05_tps: speedMissing ? null : m.speed!.p05_tps ?? null,
        p95_tps: speedMissing ? null : m.speed!.p95_tps ?? null,
        input: m.pricing?.input ?? null,
        output: m.pricing?.output ?? null,
        blended: m.pricing?.blended ?? null,
        display: m.pricing?.display ?? "",
        cn_input: cn?.input ?? null,
        cn_output: cn?.output ?? null,
        cn_display: cn ? `¥${cn.input}/¥${cn.output}` : null,
        isInternational: !m.flags.chinese_eval,
        context_window: m.meta?.context_window ?? null,
        parameters: m.meta?.parameters ?? null,
        release_date: m.meta?.release_date ?? null,
        knowledge_cutoff: m.meta?.knowledge_cutoff ?? null,
        omniscience: m.meta?.omniscience ?? null,
        arena_votes: m.arena_votes ?? null,
        openrouter_weekly_tokens: m.openrouter_weekly_tokens ?? null,
        openrouter_pricing: m.openrouter_pricing ?? null,
        arena_rankings: m.arena_rankings && Object.keys(m.arena_rankings).length > 0 ? m.arena_rankings : null,
        arena_code: m.arena_rankings?.code?.score ?? null,
        data_completeness_pct: m.data_completeness_pct ?? 0,
        license: m.license ?? null,
        benchmarks: {
          gpqa: (m.benchmarks?.gpqa ?? null) as number | null,
          hle: (m.benchmarks?.hle ?? null) as number | null,
        },
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



export function getModelById(id: string): ModelWithScores | undefined {
  initCache();
  return _cache!.byId.get(id);
}
