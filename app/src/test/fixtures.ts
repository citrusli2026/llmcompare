import { type ModelWithScores, type ModelTypeValue } from "@/lib/scoring";

export function makeModel(
  id: string,
  overrides: Partial<ModelWithScores["raw"]> & {
    flags?: Partial<ModelWithScores["flags"]>;
    type?: ModelTypeValue;
    company?: string;
    vendor_links?: ModelWithScores["vendor_links"];
  } = {}
): ModelWithScores {
  const { flags: flagOverrides, type, company, vendor_links, ...rawOverrides } = overrides;
  return {
    id,
    name: id,
    company: company ?? "TestCo",
    type: type ?? "开源",
    logo: "",
    url: "",
    vendor_links,
    flags: {
      frontier: false,
      open_weights: true,
      reasoning: false,
      image_input: false,
      chinese_eval: true,
      has_speed: false,
      data_complete: true,
      ...flagOverrides,
    },
    raw: {
      intelligence: 50,
      coding: 50,
      agentic: 50,
      median_tps: null,
      ttft_seconds: null,
      e2e_seconds: null,
      p05_tps: null,
      p95_tps: null,
      input: null,
      output: null,
      blended: null,
      display: "",
      cn_input: null,
      cn_output: null,
      cn_display: null,
      isInternational: false,
      context_window: null,
      parameters: null,
      release_date: "2024-01-01",
      knowledge_cutoff: null,
      omniscience: null,
      arena_votes: null,
      openrouter_weekly_tokens: null,
      openrouter_pricing: null,
      arena_rankings: null,
      arena_code: null,
      data_completeness_pct: 80,
      license: null,
      benchmarks: {
        gpqa: null,
        hle: null,
      },
      ...rawOverrides,
    },
  };
}
