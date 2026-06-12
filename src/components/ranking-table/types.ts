import { type ModelWithScores } from "@/lib/scoring";

export type ScoreKey = "intelligence" | "coding" | "agentic" | "cost" | "tokens";
export type SortKey = ScoreKey | "date";

export interface HeaderDef {
  key: ScoreKey;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  mobile: boolean;
  desktop: boolean;
}

export type Percentiles = { p25: number; p50: number; p75: number };
export interface ModelGroup {
  key: "all";
  labelKey: string;
  badgeClass: string;
  badgeTextClass: string;
  rowBgClass?: string;
  borderClass?: string;
  filter: (m: ModelWithScores) => boolean;
  showRank: boolean;
  rankOffset: number;
  items: ModelWithScores[];
}

/** Optional compare selection state — passed from page to row/card */
export interface CompareState {
  isInCompare: (id: string) => boolean;
  isAtMax: boolean;
  onToggle: (id: string) => void;
}
