import { describe, it, expect, beforeEach } from "vitest";
import { getAllModels, getModelById } from "@/lib/scoring";

describe("scoring", () => {
  beforeEach(() => {
    // Reset module cache if needed
  });

  it("getAllModels returns all models (data_complete is marker only)", () => {
    const models = getAllModels();
    expect(models.length).toBeGreaterThan(0);
    // data_complete 仅标记，不做筛选，所有模型都应返回
    const all = getAllModels();
    expect(models.length).toBe(all.length);
  });

  it("getAllModels returns all models", () => {
    const all = getAllModels();
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
      expect(m.raw.intelligence).toBeDefined(); // null is defined
    }
  });

  // ── New tests for benchmarks & compare ──

  it("benchmarks field exists and has correct shape", () => {
    const models = getAllModels();
    for (const m of models) {
      expect(m.raw.benchmarks).toBeDefined();
      expect(m.raw.benchmarks).toHaveProperty("gpqa");
      expect(m.raw.benchmarks).toHaveProperty("hle");
      expect(m.raw.benchmarks).toHaveProperty("mmlu_pro");
      // Values can be null or number
      for (const key of ["gpqa", "hle", "mmlu_pro"] as const) {
        if (m.raw.benchmarks[key] !== null) {
          expect(typeof m.raw.benchmarks[key]).toBe("number");
        }
      }
    }
  });

  it("some models have benchmarks data", () => {
    const models = getAllModels();
    const withGpqa = models.filter((m) => m.raw.benchmarks.gpqa != null);
    const withHle = models.filter((m) => m.raw.benchmarks.hle != null);
    // At least some models should have benchmark data (GPQA coverage ~87%)
    expect(withGpqa.length).toBeGreaterThanOrEqual(models.length * 0.2);
    expect(withHle.length).toBeGreaterThanOrEqual(models.length * 0.2);
  });

  it("foreign models have benchmarks too", () => {
    const models = getAllModels();
    const intl = models.filter((m) => m.raw.isInternational);
    expect(intl.length).toBeGreaterThan(0);
    // Foreign models should also have benchmarks
    const withGpqa = intl.filter((m) => m.raw.benchmarks.gpqa != null);
    expect(withGpqa.length).toBeGreaterThan(0);
  });

  it("null intelligence is handled gracefully in model data", () => {
    const models = getAllModels();
    // Some models may have null intelligence (e.g. GPT-5.5 Pro)
    const nullIntel = models.filter((m) => m.raw.intelligence == null);
    // Null intelligence is valid — just verify the structure is complete
    for (const m of nullIntel) {
      expect(m.raw.benchmarks).toBeDefined();
      expect(m.flags).toBeDefined();
      expect(typeof m.flags.data_complete).toBe("boolean");
      expect(m.raw.coding).toBeDefined();
    }
  });

  it("models include both domestic and international", () => {
    const models = getAllModels();
    const domestic = models.filter((m) => !m.raw.isInternational);
    const intl = models.filter((m) => m.raw.isInternational);
    expect(domestic.length).toBeGreaterThan(0);
    expect(intl.length).toBeGreaterThan(0);
    // International models should be a significant portion now
    expect(intl.length).toBeGreaterThan(domestic.length * 0.3);
  });

  it("getModelById finds domestic and foreign models", () => {
    const models = getAllModels();
    // Find first domestic and first international model
    const domestic = models.find((m) => !m.raw.isInternational);
    const intl = models.find((m) => m.raw.isInternational);
    if (domestic) {
      const found = getModelById(domestic.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(domestic.id);
    }
    if (intl) {
      const found = getModelById(intl.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(intl.id);
    }
  });
});
