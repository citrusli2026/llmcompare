import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '@/components/filter-bar';

const mockOptions = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '开源' },
  { key: 'closed', label: '闭源' },
];

describe('FilterBar', () => {
  it('renders all filter options', () => {
    render(
      <FilterBar
        options={mockOptions}
        activeKey="all"
        onFilterChange={() => {}}
      />
    );

    expect(screen.getByText('全部')).toBeInTheDocument();
    expect(screen.getByText('开源')).toBeInTheDocument();
    expect(screen.getByText('闭源')).toBeInTheDocument();
  });

  it('renders correct number of buttons', () => {
    render(
      <FilterBar
        options={mockOptions}
        activeKey="all"
        onFilterChange={() => {}}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('calls onFilterChange with correct key when clicked', () => {
    const handleChange = vi.fn();
    render(
      <FilterBar
        options={mockOptions}
        activeKey="all"
        onFilterChange={handleChange}
      />
    );

    fireEvent.click(screen.getByText('开源'));
    expect(handleChange).toHaveBeenCalledWith('open');
  });

  it('highlights the active filter', () => {
    const { container } = render(
      <FilterBar
        options={mockOptions}
        activeKey="open"
        onFilterChange={() => {}}
      />
    );

    const activeButton = container.querySelector('button[class*="accent-violet"]');
    expect(activeButton?.textContent).toBe('开源');
  });
});
