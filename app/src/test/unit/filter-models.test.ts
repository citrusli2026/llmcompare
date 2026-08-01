import { describe, it, expect } from "vitest";
import {
  filterModels,
  hasActiveFilters,
  listCompanies,
  matchesQuery,
  normalizeQuery,
  type FilterableModel,
} from "@/lib/filter-models";

const MODELS: FilterableModel[] = [
  { id: "gpt-5", name: "GPT-5", company: "OpenAI", type: "闭源" },
  { id: "claude-opus-5", name: "Claude Opus 5", company: "Anthropic", type: "闭源" },
  { id: "kimi-k3", name: "Kimi K3", company: "Moonshot AI", type: "开源" },
  { id: "deepseek-v4", name: "DeepSeek V4", company: "DeepSeek", type: "开源" },
  { id: "glm-5", name: "GLM-5", company: "Zhipu AI", type: "开源" },
];

describe("lib/filter-models", () => {
  describe("normalizeQuery", () => {
    it("去首尾空格并转小写", () => {
      expect(normalizeQuery("  GPT ")).toBe("gpt");
      expect(normalizeQuery("")).toBe("");
    });
  });

  describe("matchesQuery", () => {
    it("空搜索词匹配全部", () => {
      for (const m of MODELS) {
        expect(matchesQuery(m, "")).toBe(true);
        expect(matchesQuery(m, "   ")).toBe(true);
      }
    });

    it("按 name 匹配，大小写不敏感", () => {
      expect(matchesQuery(MODELS[0], "gpt")).toBe(true);
      expect(matchesQuery(MODELS[1], "CLAUDE")).toBe(true);
      expect(matchesQuery(MODELS[0], "claude")).toBe(false);
    });

    it("按 company 匹配", () => {
      expect(matchesQuery(MODELS[0], "openai")).toBe(true);
      expect(matchesQuery(MODELS[2], "moonshot")).toBe(true);
    });

    it("按 id 匹配", () => {
      expect(matchesQuery(MODELS[3], "deepseek-v4")).toBe(true);
      expect(matchesQuery(MODELS[4], "glm-5")).toBe(true);
    });

    it("支持部分子串", () => {
      expect(matchesQuery(MODELS[1], "opus")).toBe(true);
    });
  });

  describe("filterModels", () => {
    it("仅按类型筛选", () => {
      const result = filterModels(MODELS, { type: "开源" });
      expect(result.map((m) => m.id)).toEqual(["kimi-k3", "deepseek-v4", "glm-5"]);
    });

    it("仅按公司筛选", () => {
      const result = filterModels(MODELS, { company: "OpenAI" });
      expect(result.map((m) => m.id)).toEqual(["gpt-5"]);
    });

    it("仅按搜索词筛选", () => {
      const result = filterModels(MODELS, { query: "ai" });
      // company 含 "AI" 的 OpenAI/Moonshot AI/Zhipu AI 均命中
      expect(result.map((m) => m.id)).toEqual(["gpt-5", "kimi-k3", "glm-5"]);
    });

    it("类型 + 公司 + 搜索词组合", () => {
      const result = filterModels(MODELS, {
        type: "开源",
        company: "DeepSeek",
        query: "v4",
      });
      expect(result.map((m) => m.id)).toEqual(["deepseek-v4"]);
    });

    it("组合条件取交集，无匹配返回空数组", () => {
      expect(filterModels(MODELS, { type: "开源", company: "OpenAI" })).toEqual([]);
      expect(filterModels(MODELS, { query: "nonexistent-model" })).toEqual([]);
    });

    it("空条件返回全部", () => {
      expect(filterModels(MODELS, {})).toHaveLength(MODELS.length);
      expect(filterModels(MODELS, { query: "", company: "" })).toHaveLength(MODELS.length);
    });
  });

  describe("listCompanies", () => {
    it("去重并统计模型数，按数量降序", () => {
      const result = listCompanies(MODELS);
      // 数量均为 1，退化为名称字母序
      expect(result).toEqual([
        { name: "Anthropic", count: 1 },
        { name: "DeepSeek", count: 1 },
        { name: "Moonshot AI", count: 1 },
        { name: "OpenAI", count: 1 },
        { name: "Zhipu AI", count: 1 },
      ]);
    });

    it("数量不同按降序，相同按名称字母序", () => {
      const models: FilterableModel[] = [
        { id: "a1", name: "A1", company: "Beta", type: "开源" },
        { id: "a2", name: "A2", company: "Alpha", type: "开源" },
        { id: "a3", name: "A3", company: "Alpha", type: "开源" },
        { id: "b1", name: "B1", company: "Gamma", type: "闭源" },
      ];
      expect(listCompanies(models)).toEqual([
        { name: "Alpha", count: 2 },
        { name: "Beta", count: 1 },
        { name: "Gamma", count: 1 },
      ]);
    });

    it("空输入返回空数组", () => {
      expect(listCompanies([])).toEqual([]);
    });
  });

  describe("hasActiveFilters", () => {
    it("默认状态（无搜索词/公司，类型为默认）返回 false", () => {
      expect(hasActiveFilters({ type: "开源" }, "开源")).toBe(false);
      expect(hasActiveFilters({ type: "开源", query: "  ", company: "" }, "开源")).toBe(false);
    });

    it("有搜索词返回 true", () => {
      expect(hasActiveFilters({ type: "开源", query: "gpt" }, "开源")).toBe(true);
    });

    it("有公司筛选返回 true", () => {
      expect(hasActiveFilters({ company: "OpenAI" }, "开源")).toBe(true);
    });

    it("非默认类型返回 true", () => {
      expect(hasActiveFilters({ type: "闭源" }, "开源")).toBe(true);
    });

    it("未传类型且未指定默认类型时视为无筛选", () => {
      expect(hasActiveFilters({})).toBe(false);
    });
  });
});
