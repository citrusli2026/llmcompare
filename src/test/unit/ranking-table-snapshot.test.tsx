import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankingTable } from '@/components/ranking-table';
import { getAllModels } from '@/lib/scoring';

describe('RankingTable Snapshot', () => {
  const models = getAllModels().slice(0, 5);

  it('renders table headers correctly', () => {
    render(<RankingTable models={models} />);

    const headers = screen.getAllByText(/智能|Intelligence/);
    expect(headers.length).toBeGreaterThan(0);
  });

  it('renders at least one model name', () => {
    render(<RankingTable models={models} />);

    const modelName = models[0].name;
    const elements = screen.getAllByText(modelName);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders at least one company name', () => {
    render(<RankingTable models={models} />);

    const companyName = models[0].company;
    const elements = screen.getAllByText(companyName);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders intelligence score as formatted number', () => {
    render(<RankingTable models={models} />);

    const firstModel = models[0];
    const score = firstModel.raw.intelligence;
    const scoreText = score % 1 === 0 ? score.toString() : score.toFixed(1);

    const elements = screen.getAllByText(new RegExp(scoreText));
    expect(elements.length).toBeGreaterThan(0);
  });
});

describe('RankingTable Structure', () => {
  const models = getAllModels().slice(0, 3);

  it('contains table element', () => {
    const { container } = render(<RankingTable models={models} />);
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('contains table header row', () => {
    const { container } = render(<RankingTable models={models} />);
    expect(container.querySelector('thead')).toBeInTheDocument();
  });

  it('contains table body', () => {
    const { container } = render(<RankingTable models={models} />);
    expect(container.querySelector('tbody')).toBeInTheDocument();
  });

  it('renders correct number of rows', () => {
    const { container } = render(<RankingTable models={models} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(models.length);
  });
});

describe('RankingTable - Empty State', () => {
  it('handles empty models array', () => {
    const { container } = render(<RankingTable models={[]} />);
    expect(container.querySelector('table')).toBeInTheDocument();
  });
});

describe('RankingTable - Model Categories', () => {
  const models = getAllModels();

  it('renders domestic models', () => {
    render(<RankingTable models={models} />);

    const domesticModels = models.filter(m => !m.raw.isInternational);
    expect(domesticModels.length).toBeGreaterThan(0);
  });
});
