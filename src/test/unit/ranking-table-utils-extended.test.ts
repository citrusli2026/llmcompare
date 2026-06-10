import { describe, it, expect } from "vitest";
import { getRawValue, getScoreColor, COLOR_BY_BUCKET } from "@/components/ranking-table/utils";
import { type ModelWithScores } from "@/lib/scoring";

describe("ranking-table utils extended", () => {
  const makeModel = (overrides: Partial<ModelWithScores["raw"]> = {}): ModelWithScores => ({
    id: "test-model",
    name: "Test",
    company: "TestCo",
    type: "开源",
    logo: "",
    url: "",
    flags: {
      frontier: false,
      open_weights: true,
      reasoning: false,
      image_input: false,
      chinese_eval: true,
      has_speed: false,
      data_complete: true,
    },
    raw: {
      intelligence: 80,
      coding: 70,
      agentic: 60,
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
      output_tokens: null,
      release_date: "2024-01-01",
      omniscience: null,
      arena_votes: 1000,
      openrouter_weekly_tokens: null,
      openrouter_pricing: { prompt: 1, completion: 2 },
      arena_rankings: null,
      arena_code: 1200,
      data_completeness_pct: 80,
      license: null,
      benchmarks: { gpqa: null, hle: null, mmlu_pro: null },
      ...overrides,
    },
  });

  describe("getRawValue boundaries", () => {
    it("returns null for date key", () => {
      const model = makeModel();
      expect(getRawValue(model, "date")).toBeNull();
    });

    it("returns intelligence value", () => {
      const model = makeModel({ intelligence: 95 });
      expect(getRawValue(model, "intelligence")).toBe(95);
    });

    it("returns null when coding is null", () => {
      const model = makeModel({ coding: null });
      expect(getRawValue(model, "coding")).toBeNull();
    });

    it("returns null when agentic is undefined-ish (null)", () => {
      const model = makeModel({ agentic: null });
      expect(getRawValue(model, "agentic")).toBeNull();
    });

    it("returns cost from openrouter_pricing.completion", () => {
      const model = makeModel({ openrouter_pricing: { prompt: 5, completion: 10 } });
      expect(getRawValue(model, "cost")).toBe(10);
    });

    it("returns null when openrouter_pricing is null", () => {
      const model = makeModel({ openrouter_pricing: null });
      expect(getRawValue(model, "cost")).toBeNull();
    });

    it("returns tokens value", () => {
      const model = makeModel({ openrouter_weekly_tokens: 5000 });
      expect(getRawValue(model, "tokens")).toBe(5000);
    });

    it("returns null for missing tokens", () => {
      const model = makeModel({ openrouter_weekly_tokens: null });
      expect(getRawValue(model, "tokens")).toBeNull();
    });
  });

  describe("getScoreColor color buckets", () => {
    const percentiles = {
      intelligence: { p25: 25, p50: 50, p75: 75 },
      coding: { p25: 25, p50: 50, p75: 75 },
      agentic: { p25: 25, p50: 50, p75: 75 },
      arenaCode: { p25: 1000, p50: 1200, p75: 1400 },
      cost: { p25: 1, p50: 5, p75: 10 },
      tokens: { p25: 500, p50: 1000, p75: 2000 },
    };

    it("returns dim for null value", () => {
      expect(getScoreColor(null, "intelligence", percentiles)).toBe(COLOR_BY_BUCKET.dim);
    });

    it("returns dim for undefined value", () => {
      expect(getScoreColor(undefined, "intelligence", percentiles)).toBe(COLOR_BY_BUCKET.dim);
    });

    it("returns empty string for date key", () => {
      expect(getScoreColor(50, "date", percentiles)).toBe("");
    });

    it("returns color for tokens key with percentiles", () => {
      const p = { ...percentiles, tokens: { p25: 500, p50: 1000, p75: 2000 } };
      expect(getScoreColor(1000, "tokens", p)).toBe(COLOR_BY_BUCKET.blue);
    });

    it("ascending: top quartile gets emerald", () => {
      expect(getScoreColor(80, "intelligence", percentiles)).toBe(COLOR_BY_BUCKET.emerald);
    });

    it("ascending: second quartile gets blue", () => {
      expect(getScoreColor(60, "intelligence", percentiles)).toBe(COLOR_BY_BUCKET.blue);
    });

    it("ascending: third quartile gets amber", () => {
      expect(getScoreColor(40, "intelligence", percentiles)).toBe(COLOR_BY_BUCKET.amber);
    });

    it("ascending: bottom quartile gets red", () => {
      expect(getScoreColor(10, "intelligence", percentiles)).toBe(COLOR_BY_BUCKET.red);
    });

    it("descending (cost): low cost gets emerald", () => {
      expect(getScoreColor(0.5, "cost", percentiles)).toBe(COLOR_BY_BUCKET.emerald);
    });

    it("descending (cost): medium-low gets blue", () => {
      expect(getScoreColor(3, "cost", percentiles)).toBe(COLOR_BY_BUCKET.blue);
    });

    it("descending (cost): medium-high gets amber", () => {
      expect(getScoreColor(7, "cost", percentiles)).toBe(COLOR_BY_BUCKET.amber);
    });

    it("descending (cost): high cost gets red", () => {
      expect(getScoreColor(15, "cost", percentiles)).toBe(COLOR_BY_BUCKET.red);
    });

    it("returns dim when percentiles are null", () => {
      const emptyPercentiles = {
        intelligence: null,
        coding: null,
        agentic: null,
        cost: null,
        tokens: null,
      };
      expect(getScoreColor(80, "intelligence", emptyPercentiles)).toBe(COLOR_BY_BUCKET.dim);
    });
  });
});
