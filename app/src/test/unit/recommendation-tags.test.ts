import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ModelWithScores } from "@/lib/scoring";

const mockRef: { current: ModelWithScores[] } = vi.hoisted(() => ({
  current: [] as ModelWithScores[],
}));

vi.mock("@/lib/scoring", () => ({
  getAllModels: () => mockRef.current,
}));

import { getRecommendationTags, getModelOneLiner } from "@/lib/recommendation-tags";

function makeModel(overrides: {
  id: string;
  intel: number;
  coding?: number | null;
  agentic?: number | null;
  blended?: number | null;
  flags?: Partial<{
    frontier: boolean;
    open_weights: boolean;
    reasoning: boolean;
    image_input: boolean;
    chinese_eval: boolean;
    has_speed: boolean;
    data_complete: boolean;
  }>;
}): ModelWithScores {
  return {
    id: overrides.id,
    name: overrides.id.toUpperCase(),
    company: "X",
    type: "闭源",
    logo: "",
    url: "",
    vendor_links: undefined,
    raw: {
      intelligence: overrides.intel,
      coding: overrides.coding ?? null,
      agentic: overrides.agentic ?? null,
      median_tps: null,
      ttft_seconds: null,
      e2e_seconds: null,
      p05_tps: null,
      p95_tps: null,
      input: null,
      output: null,
      blended: overrides.blended ?? null,
      display: "",
      cn_input: null,
      cn_output: null,
      cn_display: null,
      isInternational: false,
      context_window: null,
      parameters: null,
      knowledge_cutoff: null,
      release_date: null,
      omniscience: null,
      arena_votes: null,
      openrouter_weekly_tokens: null,
      openrouter_pricing: null,
      arena_rankings: null,
      arena_code: null,
      data_completeness_pct: 100,
      license: null,
      benchmarks: { gpqa: null, hle: null },
    },
    flags: {
      frontier: false,
      open_weights: false,
      reasoning: false,
      image_input: false,
      chinese_eval: true,
      has_speed: true,
      data_complete: true,
      ...overrides.flags,
    },
  };
}

const keyOf = (tags: { key: string }[]) => tags.map((t) => t.key).sort();

describe("getRecommendationTags", () => {
  beforeEach(() => {
    mockRef.current = [];
  });

  it("returns no tags when no models exist", () => {
    mockRef.current = [];
    const m = makeModel({ id: "a", intel: 70 });
    expect(getRecommendationTags(m)).toEqual([]);
  });

  it("grants badgeCoding when coding is in top 25% AND ≥ 40", () => {
    // 4 models sorted desc: coding = 80, 50, 50, 10 → top25% index = floor(4 * 0.25) = 1 → threshold = 50
    mockRef.current = [
      makeModel({ id: "a", intel: 60, coding: 80 }),
      makeModel({ id: "b", intel: 60, coding: 50 }),
      makeModel({ id: "c", intel: 60, coding: 50 }),
      makeModel({ id: "d", intel: 60, coding: 10 }),
    ];
    const tags = getRecommendationTags(mockRef.current[0]);
    expect(keyOf(tags)).toContain("badgeCoding");
  });

  it("does not grant badgeCoding when score is high but below 40 floor", () => {
    // top25% threshold = 50, but subject is 38 (< 40 floor) → no badge
    mockRef.current = [
      makeModel({ id: "a", intel: 60, coding: 38 }),
      makeModel({ id: "b", intel: 60, coding: 50 }),
      makeModel({ id: "c", intel: 60, coding: 50 }),
      makeModel({ id: "d", intel: 60, coding: 50 }),
    ];
    expect(keyOf(getRecommendationTags(mockRef.current[0]))).not.toContain("badgeCoding");
  });

  it("grants badgeAgent when agentic is in top 25% AND ≥ 35", () => {
    // 4 models desc: agentic = 70, 60, 60, 20 → top25% threshold = 60
    mockRef.current = [
      makeModel({ id: "a", intel: 60, agentic: 70 }),
      makeModel({ id: "b", intel: 60, agentic: 60 }),
      makeModel({ id: "c", intel: 60, agentic: 60 }),
      makeModel({ id: "d", intel: 60, agentic: 20 }),
    ];
    expect(keyOf(getRecommendationTags(mockRef.current[0]))).toContain("badgeAgent");
  });

  it("grants badgeValue when intel ≥ 40 AND blended is in cheaper half", () => {
    // priced models asc: blended = 0.5, 1.0, 2.0, 5.0 → median index = 2 → median = 2.0
    // subject intel=50, blended=0.5 ≤ 2.0 → value badge
    mockRef.current = [
      makeModel({ id: "a", intel: 50, blended: 0.5 }),
      makeModel({ id: "b", intel: 50, blended: 1.0 }),
      makeModel({ id: "c", intel: 50, blended: 2.0 }),
      makeModel({ id: "d", intel: 50, blended: 5.0 }),
    ];
    expect(keyOf(getRecommendationTags(mockRef.current[0]))).toContain("badgeValue");
  });

  it("does not grant badgeValue when intel < 40", () => {
    mockRef.current = [
      makeModel({ id: "a", intel: 30, blended: 0.1 }),
      makeModel({ id: "b", intel: 50, blended: 5.0 }),
      makeModel({ id: "c", intel: 50, blended: 5.0 }),
      makeModel({ id: "d", intel: 50, blended: 5.0 }),
    ];
    expect(keyOf(getRecommendationTags(mockRef.current[0]))).not.toContain("badgeValue");
  });

  it("grants badgeReasoning when reasoning flag set AND intel in top 25%", () => {
    // intel desc: 80, 60, 40, 30 → top25% threshold = 60
    // subject intel=80 ≥ 60, reasoning=true → badge
    mockRef.current = [
      makeModel({ id: "a", intel: 80, flags: { reasoning: true } }),
      makeModel({ id: "b", intel: 60 }),
      makeModel({ id: "c", intel: 40 }),
      makeModel({ id: "d", intel: 30 }),
    ];
    expect(keyOf(getRecommendationTags(mockRef.current[0]))).toContain("badgeReasoning");
  });

  it("does not grant badgeReasoning when reasoning flag absent", () => {
    mockRef.current = [
      makeModel({ id: "a", intel: 80 }),
      makeModel({ id: "b", intel: 60 }),
    ];
    expect(keyOf(getRecommendationTags(mockRef.current[0]))).not.toContain("badgeReasoning");
  });

  it("grants badgeBudget when blended < $1 AND intel ≥ 30", () => {
    mockRef.current = [
      makeModel({ id: "a", intel: 30, blended: 0.5 }),
      makeModel({ id: "b", intel: 50, blended: 5.0 }),
    ];
    expect(keyOf(getRecommendationTags(mockRef.current[0]))).toContain("badgeBudget");
  });

  it("does not grant badgeBudget when intel < 30", () => {
    mockRef.current = [
      makeModel({ id: "a", intel: 20, blended: 0.5 }),
    ];
    expect(keyOf(getRecommendationTags(mockRef.current[0]))).not.toContain("badgeBudget");
  });

  it("grants badgeOpenLeader when open_weights AND intel ≥ 50", () => {
    mockRef.current = [
      makeModel({ id: "a", intel: 50, flags: { open_weights: true } }),
      makeModel({ id: "b", intel: 60 }),
    ];
    expect(keyOf(getRecommendationTags(mockRef.current[0]))).toContain("badgeOpenLeader");
  });

  it("does not grant badgeOpenLeader when open_weights false", () => {
    mockRef.current = [
      makeModel({ id: "a", intel: 60 }),
    ];
    expect(keyOf(getRecommendationTags(mockRef.current[0]))).not.toContain("badgeOpenLeader");
  });

  it("ignores null scores in percentile calculation", () => {
    // Only 2 models have coding scores: 50, 10 → top25% threshold = 50
    mockRef.current = [
      makeModel({ id: "a", intel: 50, coding: 50 }),
      makeModel({ id: "b", intel: 50, coding: null }),
      makeModel({ id: "c", intel: 50, coding: 10 }),
      makeModel({ id: "d", intel: 50, coding: null }),
    ];
    // 50 is at the top25% threshold for the 2 valid scores → still qualifies
    expect(keyOf(getRecommendationTags(mockRef.current[0]))).toContain("badgeCoding");
  });
});

describe("getModelOneLiner", () => {
  beforeEach(() => {
    mockRef.current = [];
  });

  it("returns oneLinerTopIntel when model ranks top 5 by intelligence", () => {
    mockRef.current = [
      makeModel({ id: "a", intel: 80 }),
      makeModel({ id: "b", intel: 70 }),
      makeModel({ id: "c", intel: 60 }),
    ];
    expect(getModelOneLiner(mockRef.current[0]).labelKey).toBe("product.oneLinerTopIntel");
    expect(getModelOneLiner(mockRef.current[1]).labelKey).toBe("product.oneLinerTopIntel");
  });

  it("returns oneLinerFrontierValue when frontier + blended > 0 + blended < 1", () => {
    // 6 decoys with higher intel push subject's intel rank to 7 (out of top 5)
    mockRef.current = [
      makeModel({ id: "a", intel: 30, blended: 0.5, flags: { frontier: true } }),
      makeModel({ id: "d1", intel: 80 }),
      makeModel({ id: "d2", intel: 70 }),
      makeModel({ id: "d3", intel: 60 }),
      makeModel({ id: "d4", intel: 50 }),
      makeModel({ id: "d5", intel: 45 }),
      makeModel({ id: "d6", intel: 40 }),
    ];
    expect(getModelOneLiner(mockRef.current[0]).labelKey).toBe("product.oneLinerFrontierValue");
  });

  it("returns oneLinerCoding when ranking in top 10 by coding", () => {
    // 6 decoys push subject: intel rank 7 (out of top 5), coding rank 7 (in top 10)
    mockRef.current = [
      makeModel({ id: "a", intel: 10, coding: 50 }),
      ...Array.from({ length: 6 }, (_, i) => makeModel({ id: `d${i}`, intel: 90 - i, coding: 90 - i })),
    ];
    expect(getModelOneLiner(mockRef.current[0]).labelKey).toBe("product.oneLinerCoding");
  });

  it("returns oneLinerAgentic when ranking in top 10 by agentic", () => {
    // 6 decoys push subject: intel rank 7, agentic rank 7
    mockRef.current = [
      makeModel({ id: "a", intel: 10, agentic: 50 }),
      ...Array.from({ length: 6 }, (_, i) => makeModel({ id: `d${i}`, intel: 90 - i, agentic: 90 - i })),
    ];
    expect(getModelOneLiner(mockRef.current[0]).labelKey).toBe("product.oneLinerAgentic");
  });

  it("returns oneLinerReasoning when reasoning flag set but no higher priority matches", () => {
    // 11 decoys with higher intel/coding/agentic push subject outside all top-N bounds
    mockRef.current = [
      ...Array.from({ length: 11 }, (_, i) => makeModel({ id: `d${i}`, intel: 90 - i, coding: 90 - i, agentic: 90 - i })),
      makeModel({ id: "z", intel: 5, coding: 0, agentic: 0, flags: { reasoning: true } }),
    ];
    expect(getModelOneLiner(mockRef.current[11]).labelKey).toBe("product.oneLinerReasoning");
  });

  it("returns oneLinerDefault for unremarkable models", () => {
    // 11 decoys with higher intel/coding/agentic push subject outside top 5 intel and top 10 coding/agentic
    mockRef.current = [
      ...Array.from({ length: 11 }, (_, i) => makeModel({ id: `d${i}`, intel: 90 - i, coding: 90 - i, agentic: 90 - i })),
      makeModel({ id: "z", intel: 5, coding: 5, agentic: 5 }),
    ];
    expect(getModelOneLiner(mockRef.current[11]).labelKey).toBe("product.oneLinerDefault");
  });

  it("returns oneLinerDefault when model not found in rankings", () => {
    mockRef.current = [makeModel({ id: "a", intel: 80 })];
    const unknown = makeModel({ id: "missing", intel: 0 });
    // intelRank = -1 (findIndex returns -1) + 1 = 0 → no branch matches
    expect(getModelOneLiner(unknown).labelKey).toBe("product.oneLinerDefault");
  });
});
