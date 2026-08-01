import { describe, it, expect } from "vitest";
import { formatTokenCount, formatParameters, getTypeBadgeClasses, getFeatureBadgeClasses, isValuePick, cn } from "@/lib/utils";
import { ModelType, type ModelWithScores } from "@/lib/scoring";

describe("lib/utils", () => {
  describe("cn", () => {
    it("merges classes correctly", () => {
      expect(cn("a", "b")).toBe("a b");
      expect(cn("a", false && "b")).toBe("a");
      expect(cn("a", undefined, "b")).toBe("a b");
    });
  });

  describe("formatTokenCount", () => {
    it("formats trillions", () => {
      const result = formatTokenCount(1.5e12);
      expect(result.value).toBe("1.50");
      expect(result.unit).toBe("T");
    });

    it("formats billions", () => {
      const result = formatTokenCount(7.2e9);
      expect(result.value).toBe("7.2");
      expect(result.unit).toBe("B");
    });

    it("formats millions", () => {
      const result = formatTokenCount(500e6);
      expect(result.value).toBe("500.0");
      expect(result.unit).toBe("M");
    });

    it("formats small numbers as-is", () => {
      const result = formatTokenCount(100000);
      expect(result.value).toBe("100,000");
      expect(result.unit).toBe("");
    });
  });

  describe("formatParameters", () => {
    it("formats trillions", () => {
      expect(formatParameters(1000)).toBe("1T");
      expect(formatParameters(1500)).toBe("1.5T");
    });

    it("formats billions", () => {
      expect(formatParameters(7)).toBe("7B");
      expect(formatParameters(70)).toBe("70B");
    });
  });

  describe("getTypeBadgeClasses", () => {
    it("returns open classes", () => {
      expect(getTypeBadgeClasses(ModelType.Open)).toContain("accent-lime");
    });

    it("returns closed classes", () => {
      expect(getTypeBadgeClasses(ModelType.Closed)).toContain("accent-violet");
    });
  });

  describe("getFeatureBadgeClasses", () => {
    it("returns correct classes for each feature", () => {
      expect(getFeatureBadgeClasses("frontier")).toContain("accent-violet");
      expect(getFeatureBadgeClasses("reasoning")).toContain("accent-amber");
      expect(getFeatureBadgeClasses("open_weights")).toContain("accent-lime");
      expect(getFeatureBadgeClasses("image_input")).toContain("accent-cyan");
      expect(getFeatureBadgeClasses("chinese_eval")).toContain("accent-blue");
    });
  });

  describe("isValuePick", () => {
    const makeModel = (intelligence: number, blended: number | null): ModelWithScores => ({
      id: "test",
      name: "Test Model",
      company: "Test Co",
      type: ModelType.Open,
      logo: "",
      url: "",
      raw: {
        intelligence,
        coding: null,
        agentic: null,
        median_tps: null,
        ttft_seconds: null,
        e2e_seconds: null,
        p05_tps: null,
        p95_tps: null,
        input: null,
        output: null,
        blended,
        display: "",
        cn_input: null,
        cn_output: null,
        cn_display: null,
        isInternational: true,
        context_window: null,
        parameters: null,
        release_date: null,
        knowledge_cutoff: null,
        omniscience: null,
        max_output_tokens: null,
        arena_votes: null,
        openrouter_weekly_tokens: null,
        openrouter_pricing: null,
        arena_rankings: null,
        arena_code: null,
        data_completeness_pct: 100,
        license: null,
        benchmarks: { gpqa: null, hle: null, scicode: null, lcr: null, critpt: null, ifbench: null, tau2: null, terminalbench_hard: null, mmmu_pro: null, gdpval: null, livecodebench: null, aime25: null },
      },
      flags: {
        frontier: false,
        open_weights: false,
        reasoning: false,
        image_input: false,
        chinese_eval: false,
        has_speed: false,
        data_complete: true,
        tools_calling: null,
      },
    });

    it("returns false for intelligence < 40", () => {
      expect(isValuePick(makeModel(39, 1), [makeModel(39, 1)])).toBe(false);
    });

    it("returns false for null blended", () => {
      expect(isValuePick(makeModel(40, null), [makeModel(40, null)])).toBe(false);
    });

    it("returns false for blended <= 0", () => {
      expect(isValuePick(makeModel(40, 0), [makeModel(40, 0)])).toBe(false);
    });

    it("returns true when value is in bottom 50%", () => {
      const models = [
        makeModel(40, 1),
        makeModel(40, 5),
        makeModel(40, 10),
        makeModel(40, 20),
      ];
      expect(isValuePick(makeModel(40, 1), models)).toBe(true);
    });

    it("returns false when value is in top 50%", () => {
      const models = [
        makeModel(40, 1),
        makeModel(40, 5),
        makeModel(40, 10),
        makeModel(40, 20),
      ];
      expect(isValuePick(makeModel(40, 20), models)).toBe(false);
    });
  });
});
