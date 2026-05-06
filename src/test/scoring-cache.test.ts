import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAllModels, getAllModelsUnfiltered, getModelById } from "@/lib/scoring";

describe("scoring cache", () => {
  beforeEach(() => {
    // Reset module state by re-importing (simulate fresh cache)
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getAllModels returns consistent results across multiple calls", () => {
    const models1 = getAllModels();
    const models2 = getAllModels();
    expect(models1).toStrictEqual(models2); // same content due to cache
  });

  it("getAllModelsUnfiltered returns more or equal models than filtered", () => {
    const all = getAllModelsUnfiltered();
    const filtered = getAllModels();
    expect(all.length).toBeGreaterThanOrEqual(filtered.length);
  });

  it("getModelById returns same reference for same id", () => {
    const models = getAllModels();
    if (models.length > 0) {
      const id = models[0].id;
      const m1 = getModelById(id);
      const m2 = getModelById(id);
      expect(m1).toBe(m2); // same object reference
    }
  });

  it("getModelById returns undefined for unknown id", () => {
    expect(getModelById("__unknown__")).toBeUndefined();
  });

  it("cached models have valid structure", () => {
    const models = getAllModels();
    for (const m of models) {
      expect(m).toHaveProperty("id");
      expect(m).toHaveProperty("name");
      expect(m).toHaveProperty("company");
      expect(m).toHaveProperty("raw");
      expect(m).toHaveProperty("flags");
      expect(typeof m.id).toBe("string");
      expect(typeof m.name).toBe("string");
    }
  });

  it("cached byId map covers all models", () => {
    const all = getAllModelsUnfiltered();
    for (const m of all) {
      const found = getModelById(m.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(m.id);
    }
  });

  it("flags.data_complete filters correctly", () => {
    const all = getAllModelsUnfiltered();
    const filtered = getAllModels();
    const completeCount = all.filter((m) => m.flags.data_complete).length;
    expect(filtered.length).toBe(completeCount);
  });

  it("raw scores are numbers or null", () => {
    const models = getAllModels();
    for (const m of models) {
      expect(typeof m.raw.intelligence).toBe("number");
      if (m.raw.coding !== null) {
        expect(typeof m.raw.coding).toBe("number");
      }
      if (m.raw.agentic !== null) {
        expect(typeof m.raw.agentic).toBe("number");
      }
    }
  });

  it("type is either 开源 or 闭源", () => {
    const models = getAllModels();
    for (const m of models) {
      expect(["开源", "闭源"]).toContain(m.type);
    }
  });

  it("isInternational is boolean", () => {
    const models = getAllModels();
    for (const m of models) {
      expect(typeof m.raw.isInternational).toBe("boolean");
    }
  });
});
