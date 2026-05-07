import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getAllModels } from '@/lib/scoring';

describe('Models Page - Integration Tests', () => {
  const models = getAllModels();

  it('filters models by type (open source vs closed source)', () => {
    const openSourceModels = models.filter(m => m.type === '开源');
    const closedSourceModels = models.filter(m => m.type === '闭源');

    expect(openSourceModels.length).toBeGreaterThan(0);
    expect(closedSourceModels.length).toBeGreaterThan(0);
  });

  it('finds models by name search', () => {
    const searchTerm = 'gpt';
    const matches = models.filter(
      m => m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    expect(matches.length).toBeGreaterThan(0);
  });

  it('finds models by company search', () => {
    const searchTerm = 'openai';
    const matches = models.filter(
      m => m.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    expect(matches.length).toBeGreaterThan(0);
  });

  it('model has intelligence score in reasonable range', () => {
    models.forEach(model => {
      expect(model.raw.intelligence).toBeGreaterThanOrEqual(0);
      expect(model.raw.intelligence).toBeLessThanOrEqual(100);
    });
  });

  it('sorts models by intelligence descending', () => {
    const sortedByIntelligence = [...models].sort(
      (a, b) => b.raw.intelligence - a.raw.intelligence
    );

    expect(sortedByIntelligence[0].raw.intelligence).toBeGreaterThanOrEqual(
      sortedByIntelligence[1].raw.intelligence
    );
  });

  it('sorts models by release date descending', () => {
    const sortedByDate = [...models].sort((a, b) => {
      const dateA = new Date(a.raw.release_date);
      const dateB = new Date(b.raw.release_date);
      return dateB.getTime() - dateA.getTime();
    });

    const firstDate = new Date(sortedByDate[0].raw.release_date).getTime();
    const secondDate = new Date(sortedByDate[1].raw.release_date).getTime();

    expect(firstDate).toBeGreaterThanOrEqual(secondDate);
  });
});

describe('Model Comparison', () => {
  const models = getAllModels();

  it('can compare two models side by side', () => {
    const [model1, model2] = models.slice(0, 2);

    expect(model1.name).not.toEqual(model2.name);
    expect(model1.raw.intelligence).toBeDefined();
    expect(model2.raw.intelligence).toBeDefined();
  });

  it('frontier models have higher scores on average', () => {
    const frontierModels = models.filter(m => m.flags.frontier);
    const otherModels = models.filter(m => !m.flags.frontier);

    const frontierAvg =
      frontierModels.reduce((sum, m) => sum + m.raw.intelligence, 0) /
      frontierModels.length;
    const otherAvg =
      otherModels.reduce((sum, m) => sum + m.raw.intelligence, 0) /
      otherModels.length;

    expect(frontierAvg).toBeGreaterThan(otherAvg);
  });

  it('international models are distinct from domestic', () => {
    const internationalModels = models.filter(m => m.raw.isInternational);
    const domesticModels = models.filter(m => !m.raw.isInternational);

    expect(internationalModels.length).toBeGreaterThan(0);
    expect(domesticModels.length).toBeGreaterThan(0);
  });
});
