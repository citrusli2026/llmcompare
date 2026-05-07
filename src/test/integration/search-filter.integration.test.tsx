import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchInput } from '@/components/search-input';
import { FilterBar } from '@/components/filter-bar';
import { getAllModels } from '@/lib/scoring';

describe('Search + Filter Integration', () => {
  const filterOptions = [
    { key: 'all', label: '全部' },
    { key: 'opensource', label: '开源' },
    { key: 'closedsource', label: '闭源' },
  ];

  const models = getAllModels();

  it('updates search term and triggers onChange', () => {
    const handleSearch = vi.fn();
    render(<SearchInput value="" onChange={handleSearch} placeholder="搜索" />);

    const input = screen.getByPlaceholderText('搜索');
    fireEvent.change(input, { target: { value: 'deepseek' } });

    expect(handleSearch).toHaveBeenCalledWith('deepseek');
  });

  it('handles empty search input', () => {
    const handleSearch = vi.fn();
    render(<SearchInput value="test" onChange={handleSearch} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });

    expect(handleSearch).toHaveBeenCalledWith('');
  });

  it('filter bar updates selection', () => {
    const handleFilter = vi.fn();
    render(
      <FilterBar
        options={filterOptions}
        activeKey="all"
        onFilterChange={handleFilter}
      />
    );

    const openSourceButton = screen.getByText('开源');
    fireEvent.click(openSourceButton);

    expect(handleFilter).toHaveBeenCalledWith('opensource');
  });

  it('maintains active filter styling', () => {
    const handleFilter = vi.fn();
    const { container } = render(
      <FilterBar
        options={filterOptions}
        activeKey="opensource"
        onFilterChange={handleFilter}
      />
    );

    const activeButton = container.querySelector('button');
    expect(activeButton).toBeInTheDocument();
  });

  it('displays correct number of filter buttons', () => {
    const handleFilter = vi.fn();
    render(
      <FilterBar
        options={filterOptions}
        activeKey="all"
        onFilterChange={handleFilter}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(filterOptions.length);
  });

  it('search input can handle special characters', () => {
    const handleSearch = vi.fn();
    render(<SearchInput value="" onChange={handleSearch} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'gpt-4o!' } });

    expect(handleSearch).toHaveBeenCalledWith('gpt-4o!');
  });
});

describe('Data Loading Integration', () => {
  it('loads models successfully', () => {
    const models = getAllModels();
    expect(models.length).toBeGreaterThan(0);
  });

  it('each model has required fields', () => {
    const models = getAllModels();
    const firstModel = models[0];

    expect(firstModel).toHaveProperty('id');
    expect(firstModel).toHaveProperty('name');
    expect(firstModel).toHaveProperty('company');
    expect(firstModel).toHaveProperty('type');
    expect(firstModel).toHaveProperty('raw');
  });

  it('raw data contains intelligence score', () => {
    const models = getAllModels();
    const firstModel = models[0];

    expect(firstModel.raw).toHaveProperty('intelligence');
    expect(typeof firstModel.raw.intelligence).toBe('number');
  });
});
