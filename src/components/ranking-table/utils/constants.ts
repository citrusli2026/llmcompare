import { Brain, Code, Bot, Trophy, DollarSign, TrendingUp } from "lucide-react";
import type { ScoreKey } from "../utils/renderers";

export const HEADERS: {
  key: ScoreKey;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  mobile: boolean;
  desktop: boolean;
}[] = [
  { key: "intelligence", labelKey: "models.colIntelligence", icon: Brain, mobile: true, desktop: true },
  { key: "coding", labelKey: "models.colCoding", icon: Code, mobile: false, desktop: true },
  { key: "agentic", labelKey: "models.colAgentic", icon: Bot, mobile: false, desktop: true },
  { key: "arenaCode", labelKey: "models.colArenaCode", icon: Trophy, mobile: false, desktop: true },
  { key: "cost", labelKey: "models.colCost", icon: DollarSign, mobile: false, desktop: true },
  { key: "tokens", labelKey: "models.colTokens", icon: TrendingUp, mobile: false, desktop: true },
];

export const MOBILE_SORT_OPTIONS: { key: string; labelKey: string }[] = [
  { key: "", labelKey: "models.sortBy" },
  { key: "intelligence", labelKey: "models.colIntelligence" },
  { key: "cost", labelKey: "models.colCost" },
  { key: "tokens", labelKey: "models.colTokens" },
  { key: "date", labelKey: "table.date" },
];

export const MOBILE_METRIC_ORDER: ScoreKey[] = ["intelligence", "cost", "tokens"];
