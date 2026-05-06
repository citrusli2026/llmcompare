import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';
import { formatTokenCount } from '@/lib/utils';

describe('cn - className merger', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
    expect(cn('base', !isActive && 'active')).toBe('base');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles array inputs', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });
});

describe('formatTokenCount', () => {
  it('formats trillions correctly', () => {
    expect(formatTokenCount(1000000000000)).toEqual({ value: '1.00', unit: 'T' });
    expect(formatTokenCount(5000000000000)).toEqual({ value: '5.00', unit: 'T' });
  });

  it('formats billions correctly', () => {
    expect(formatTokenCount(1000000000)).toEqual({ value: '1.0', unit: 'B' });
    expect(formatTokenCount(5000000000)).toEqual({ value: '5.0', unit: 'B' });
  });

  it('formats millions correctly', () => {
    expect(formatTokenCount(1000000)).toEqual({ value: '1.0', unit: 'M' });
    expect(formatTokenCount(1500000)).toEqual({ value: '1.5', unit: 'M' });
  });

  it('formats thousands without unit', () => {
    expect(formatTokenCount(500000)).toEqual({ value: '500,000', unit: '' });
    expect(formatTokenCount(999)).toEqual({ value: '999', unit: '' });
  });
});
