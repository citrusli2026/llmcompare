import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from '@/components/search-input';

describe('SearchInput', () => {
  it('renders with placeholder text', () => {
    render(
      <SearchInput
        value=""
        onChange={() => {}}
        placeholder="搜索模型..."
      />
    );

    expect(screen.getByPlaceholderText('搜索模型...')).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(
      <SearchInput
        value="deepseek"
        onChange={() => {}}
      />
    );

    const input = screen.getByDisplayValue('deepseek');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const handleChange = vi.fn();
    render(
      <SearchInput
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'kimi' } });

    expect(handleChange).toHaveBeenCalledWith('kimi');
  });

  it('uses default placeholder when not provided', () => {
    render(
      <SearchInput
        value=""
        onChange={() => {}}
      />
    );

    expect(screen.getByPlaceholderText('搜索...')).toBeInTheDocument();
  });
});
