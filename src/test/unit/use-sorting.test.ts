import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSortedModels } from '@/components/ranking-table/hooks/use-sorting';
import type { ModelWithScores } from '@/lib/scoring';

const createMockModel = (overrides: Partial<ModelWithScores> = {}): ModelWithScores => ({
  id: Math.random().toString(36),
  name: 'Test Model',
  company: 'Test Company',
  type: '闭源',
  logo: '/logo.svg',
  url: 'https://example.com',
  raw: {
    intelligence: 50,
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
  ...overrides,
} as ModelWithScores);

describe('useSortedModels', () => {
  const models: ModelWithScores[] = [
    createMockModel({
      id: 'm1',
      name: 'Model A',
      raw: { intelligence: 60, release_date: '2024-01-01', isInternational: true },
      flags: { data_complete: true, frontier: false, chinese_eval: false },
    }),
    createMockModel({
      id: 'm2',
      name: 'Model B',
      raw: { intelligence: 80, release_date: '2024-06-01', isInternational: false },
      flags: { data_complete: true, frontier: true, chinese_eval: true },
    }),
    createMockModel({
      id: 'm3',
      name: 'Model C',
      raw: { intelligence: 70, release_date: '2024-03-01', isInternational: false },
      flags: { data_complete: true, frontier: true, chinese_eval: true },
    }),
  ];

  it('separates international and domestic models', () => {
    const { result } = renderHook(() =>
      useSortedModels({ models, sortKey: 'date', sortDesc: true })
    );

    expect(result.current.sortedIntl).toHaveLength(1);
    expect(result.current.sortedIntl[0].id).toBe('m1');
  });

  it('separates frontier and mainstream domestic models', () => {
    const { result } = renderHook(() =>
      useSortedModels({ models, sortKey: 'date', sortDesc: true })
    );

    expect(result.current.sortedFrontier).toHaveLength(2);
    expect(result.current.sortedMainstream).toHaveLength(0);
  });

  it('sorts by intelligence descending by default (date)', () => {
    const { result } = renderHook(() =>
      useSortedModels({ models, sortKey: 'date', sortDesc: true })
    );

    expect(result.current.sortedFrontier[0].raw.intelligence).toBe(80);
    expect(result.current.sortedFrontier[1].raw.intelligence).toBe(70);
  });

  it('sorts by date descending when sortKey is date', () => {
    const { result } = renderHook(() =>
      useSortedModels({ models, sortKey: 'date', sortDesc: true })
    );

    expect(result.current.sortedFrontier[0].raw.release_date).toBe('2024-06-01');
    expect(result.current.sortedFrontier[1].raw.release_date).toBe('2024-03-01');
  });

  it('returns correct frontier count', () => {
    const { result } = renderHook(() =>
      useSortedModels({ models, sortKey: 'date', sortDesc: true })
    );

    expect(result.current.frontierCount).toBe(2);
  });
});
