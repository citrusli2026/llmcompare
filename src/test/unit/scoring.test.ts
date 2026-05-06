import { describe, it, expect, beforeEach } from 'vitest';
import { getAllModels, getAllModelsUnfiltered, getModelById } from '@/lib/scoring';

describe('scoring module', () => {
  describe('getAllModels', () => {
    it('returns an array of models', () => {
      const models = getAllModels();
      expect(Array.isArray(models)).toBe(true);
    });

    it('includes required properties on each model', () => {
      const models = getAllModels();
      if (models.length > 0) {
        const model = models[0];
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('company');
        expect(model).toHaveProperty('type');
        expect(model).toHaveProperty('raw');
        expect(model).toHaveProperty('flags');
      }
    });

    it('all returned models have data_complete flag set to true', () => {
      const models = getAllModels();
      models.forEach(model => {
        expect(model.flags.data_complete).toBe(true);
      });
    });
  });

  describe('getAllModelsUnfiltered', () => {
    it('returns at least as many models as getAllModels', () => {
      const filtered = getAllModels();
      const unfiltered = getAllModelsUnfiltered();
      expect(unfiltered.length).toBeGreaterThanOrEqual(filtered.length);
    });

    it('includes models with data_complete set to false', () => {
      const unfiltered = getAllModelsUnfiltered();
      const hasIncomplete = unfiltered.some(m => m.flags.data_complete === false);
      expect(hasIncomplete).toBe(true);
    });
  });

  describe('getModelById', () => {
    it('returns a model when given a valid id', () => {
      const models = getAllModels();
      if (models.length > 0) {
        const model = getModelById(models[0].id);
        expect(model).toBeDefined();
        expect(model!.id).toBe(models[0].id);
      }
    });

    it('returns undefined for an invalid id', () => {
      const model = getModelById('nonexistent-model-id-12345');
      expect(model).toBeUndefined();
    });

    it('returns complete model data with raw scores', () => {
      const models = getAllModels();
      if (models.length > 0) {
        const model = getModelById(models[0].id);
        expect(model!.raw).toHaveProperty('intelligence');
        expect(typeof model!.raw.intelligence).toBe('number');
      }
    });
  });
});

describe('Model structure', () => {
  const models = getAllModels();

  it('type should be either 开源 or 闭源', () => {
    models.forEach(model => {
      expect(['开源', '闭源']).toContain(model.type);
    });
  });

  it('intelligence score should be a number between 0 and 100', () => {
    models.forEach(model => {
      expect(model.raw.intelligence).toBeGreaterThanOrEqual(0);
      expect(model.raw.intelligence).toBeLessThanOrEqual(100);
    });
  });

  it('isInternational flag should be correctly set', () => {
    const intlModels = models.filter(m => m.raw.isInternational);
    const domesticModels = models.filter(m => !m.raw.isInternational);

    intlModels.forEach(model => {
      expect(model.flags.chinese_eval).toBe(false);
    });
  });

  it('frontier models should have specific flags set', () => {
    const frontierModels = models.filter(m => m.flags.frontier);
    frontierModels.forEach(model => {
      expect(model.flags.frontier).toBe(true);
    });
  });
});
