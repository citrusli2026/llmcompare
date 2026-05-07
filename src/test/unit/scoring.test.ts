import { describe, it, expect, beforeEach } from "vitest";
import { getAllModels, getAllModelsUnfiltered, getModelById } from "@/lib/scoring";

describe("scoring", () => {
  beforeEach(() => {
    // Reset module cache if needed
  });

  it("getAllModels returns only data_complete models", () => {
    const models = getAllModels();
    expect(models.length).toBeGreaterThan(0);
    for (const m of models) {
      expect(m.flags.data_complete).toBe(true);
    }
  });

  it("getAllModelsUnfiltered returns all models", () => {
    const all = getAllModelsUnfiltered();
    const filtered = getAllModels();
    expect(all.length).toBeGreaterThanOrEqual(filtered.length);
  });

  it("getModelById finds existing model", () => {
    const models = getAllModels();
    if (models.length > 0) {
      const first = models[0];
      const found = getModelById(first.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(first.id);
    }
  });

  it("getModelById returns undefined for non-existent", () => {
    const found = getModelById("non-existent-model-12345");
    expect(found).toBeUndefined();
  });

  it("model has required fields", () => {
    const models = getAllModels();
    for (const m of models) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.company).toBeTruthy();
      expect(m.raw.intelligence).toBeDefined();
    }
  });
});
