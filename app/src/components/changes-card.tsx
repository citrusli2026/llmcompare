"use client";

import { useMemo } from "react";
import { useTranslation } from "@/lib/i18n";
import { ArrowUp, ArrowDown, Sparkles, TrendingDown, DollarSign, Brain } from "lucide-react";

interface Change {
  type: string;
  model: string;
  id: string;
  rank?: number;
  old_rank?: number;
  new_rank?: number;
  change?: number;
  detail: string;
  icon: string;
  old?: number;
  new?: number;
  change_pct?: number;
}

interface ChangesData {
  generated_at: string;
  date: string;
  compare_with: string;
  summary: {
    new_models: number;
    dropped_models: number;
    price_changes: number;
    ranking_changes: number;
    intel_changes: number;
  };
  changes: Change[];
}

// Lazy-load the static JSON
let _cache: ChangesData | null = null;
function loadChanges(): ChangesData | null {
  if (_cache) return _cache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _cache = require("@/data/changes.json") as ChangesData;
    return _cache;
  } catch {
    return null;
  }
}
const TYPE_COLORS: Record<string, string> = {
  new: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  dropped: "bg-red-500/10 text-red-600 dark:text-red-400",
  ranking_up: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ranking_down: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  price_drop: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
  price_up: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  intel_change: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  new: <Sparkles className="h-3.5 w-3.5" />,
  dropped: <TrendingDown className="h-3.5 w-3.5" />,
  ranking_up: <ArrowUp className="h-3.5 w-3.5" />,
  ranking_down: <ArrowDown className="h-3.5 w-3.5" />,
  price_drop: <DollarSign className="h-3.5 w-3.5" />,
  price_up: <DollarSign className="h-3.5 w-3.5" />,
  intel_change: <Brain className="h-3.5 w-3.5" />,
};

export function ChangesCard() {
  const { t } = useTranslation();
  const data = useMemo(() => loadChanges(), []);

  if (!data || data.changes.length === 0) return null;

  const { summary, changes } = data;

  const summaryItems = [
    { count: summary.new_models, label: t("changes.new"), icon: "🆕" },
    { count: summary.dropped_models, label: t("changes.dropped"), icon: "📉" },
    { count: summary.price_changes, label: t("changes.price"), icon: "💰" },
    { count: summary.ranking_changes, label: t("changes.ranking"), icon: "📊" },
  ].filter((s) => s.count > 0);

  if (summaryItems.length === 0) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="rounded-xl border border-surface-border bg-surface-elevated p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            📊 {t("changes.title")}
          </h2>
          <span className="text-xs text-text-muted">{data.date}</span>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {summaryItems.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1 rounded-full bg-surface-base px-2.5 py-1 text-xs font-medium text-text-secondary"
            >
              <span>{s.icon}</span>
              <span className="font-semibold text-text-primary">{s.count}</span>
              <span>{s.label}</span>
            </span>
          ))}
        </div>

        {/* Change list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {changes.slice(0, 10).map((c, i) => (
            <div
              key={`${c.id}-${c.type}-${i}`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-surface-base/50 hover:bg-surface-base transition-colors"
            >
              <span
                className={`flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-md ${TYPE_COLORS[c.type] || "bg-surface-base"}`}
              >
                {TYPE_ICONS[c.type] || c.icon}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-text-primary truncate">
                  {c.model}
                </span>
                <span className="text-xs text-text-muted ml-2">{c.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
