import { formatTokenCount } from "@/lib/utils";
import type { ModelWithScores } from "@/lib/scoring";

export type ScoreKey = "intelligence" | "coding" | "agentic" | "arenaCode" | "cost" | "tokens";

export function formatScore(val: number | null | undefined): React.ReactNode {
  if (val == null) return <span className="text-text-dim text-xs">—</span>;
  return val % 1 === 0 ? val : val.toFixed(1);
}

export function getArenaCodeDisplay(model: ModelWithScores): React.ReactNode {
  if (model.raw.arena_code != null) {
    return (
      <span>
        {model.raw.arena_code}{" "}
        <span className="text-text-secondary text-[10px]">ELO</span>
      </span>
    );
  }
  return <span className="text-text-dim text-xs">—</span>;
}

export function getTokensDisplay(model: ModelWithScores): React.ReactNode {
  const val = model.raw.openrouter_weekly_tokens;
  if (val == null) return <span className="text-text-dim text-xs">—</span>;
  const { value, unit } = formatTokenCount(val);
  return (
    <span>
      {value}
      {unit && <span className="text-text-secondary text-[10px]">{unit}</span>}
    </span>
  );
}

export function getCostDisplay(model: ModelWithScores): React.ReactNode {
  if (model.raw.openrouter_pricing != null) {
    const p = model.raw.openrouter_pricing;
    return (
      <span>
        ${p.prompt}
        <span className="text-text-secondary text-[10px]">/</span>${p.completion}
        <span className="text-text-secondary text-[10px]">/M</span>
      </span>
    );
  }
  return <span className="text-text-dim text-xs">—</span>;
}

export function getMobileCostDisplay(model: ModelWithScores): React.ReactNode {
  if (model.raw.openrouter_pricing != null) {
    return (
      <span>
        ${model.raw.openrouter_pricing.completion}
        <span className="text-text-secondary text-[10px]">/M</span>
      </span>
    );
  }
  return <span className="text-text-dim text-xs">—</span>;
}

export const renderers: Record<ScoreKey, (m: ModelWithScores) => React.ReactNode> = {
  intelligence: (m) => formatScore(m.raw.intelligence),
  coding: (m) => formatScore(m.raw.coding),
  agentic: (m) => formatScore(m.raw.agentic),
  arenaCode: getArenaCodeDisplay,
  cost: getCostDisplay,
  tokens: getTokensDisplay,
};
