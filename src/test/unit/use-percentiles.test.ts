import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePercentiles } from '@/components/ranking-table/hooks/use-percentiles';
import type { ModelWithScores } from '@/lib/scoring';

const createMockModel = (intelligence: number): ModelWithScores => ({
  id: Math.random().toString(36),
  name: 'Test Model',
  company: 'Test Company',
  type: '闭源',
  logo: '/logo.svg',
  url: 'https://example.com',
  raw: {
    intelligence,
    coding: 40,
    agentic: 45,
    median_tps: null,
    ttft_seconds: null,
    e2e_seconds: null,
    input: 1,
    output: 2,
    display: '$1/$2',
    cn_input: null,
    cn_output: null,
    cn_display: null,
    isInternational: false,
    context_window: null,
    parameters: null,
    output_tokens: null,
    release_date: '2024-01-01',
    omniscience: null,
    openrouter_weekly_tokens: null,
    openrouter_pricing: null,
    arena_rankings: null,
    arena_code: null,
  },
  flags: {
    frontier: true,
    open_weights: false,
    reasoning: false,
    image_input: false,
    chinese_eval: true,
    has_speed: false,
    data_complete: true,
  },
} as ModelWithScores);

describe('usePercentiles', () => {
  it('computes percentiles for intelligence with enough data', () => {
    const models: ModelWithScores[] = [
      createMockModel(10),
      createMockModel(20),
      createMockModel(30),
      createMockModel(40),
      createMockModel(50),
      createMockModel(60),
      createMockModel(70),
      createMockModel(80),
    ];

    const { result } = renderHook(() => usePercentiles(models));

    expect(result.current.intelligence).not.toBeNull();
    expect(result.current.intelligence!.p25).toBeGreaterThan(0);
    expect(result.current.intelligence!.p50).toBeGreaterThan(result.current.intelligence!.p25);
    expect(result.current.intelligence!.p75).toBeGreaterThan(result.current.intelligence!.p50);
  });

  it('returns null for insufficient data', () => {
    const models: ModelWithScores[] = [createMockModel(50)];

    const { result } = renderHook(() => usePercentiles(models));

    expect(result.current.intelligence).toBeNull();
  });

  it('handles empty array', () => {
    const { result } = renderHook(() => usePercentiles([]));

    expect(result.current.intelligence).toBeNull();
  });

  it('sorts percentiles correctly (p25 <= p50 <= p75)', () => {
    const models: ModelWithScores[] = [
      createMockModel(10),
      createMockModel(30),
      createMockModel(50),
      createMockModel(70),
      createMockModel(90),
    ];

    const { result } = renderHook(() => usePercentiles(models));

    expect(result.current.intelligence).not.toBeNull();
    const { p25, p50, p75 } = result.current.intelligence!;
    expect(p25).toBeLessThanOrEqual(p50);
    expect(p50).toBeLessThanOrEqual(p75);
  });
});
