"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { ArrowUp, ArrowDown, Sparkles, TrendingDown, DollarSign, Brain } from "lucide-react";
import changesJson from "@/data/changes.json";

export interface Change {
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
  first_seen?: string;
  field?: string;
  intelligence?: number | null;
  tps?: number | null;
  price_input?: number | null;
}

/** 按当前语言格式化 detail；结构化字段缺失时回退到管线预烘焙的中文 detail（About 页复用） */
export function formatDetail(c: Change, t: (key: string, params?: Record<string, string | number>) => string): string {
  switch (c.type) {
    case "new": {
      if (c.intelligence == null && c.tps == null && c.price_input == null) return c.detail;
      const parts: string[] = [];
      if (c.intelligence != null) parts.push(`${t("changes.intelShort")} ${Math.round(c.intelligence)}`);
      if (c.tps != null) parts.push(`${c.tps} TPS`);
      if (c.price_input != null) parts.push(`$${c.price_input}/M`);
      return parts.join(" · ");
    }
    case "ranking_up":
    case "ranking_down":
      return `#${c.old_rank} → #${c.new_rank}`;
    case "price_drop":
    case "price_up": {
      if (c.old == null || c.new == null || c.change_pct == null) return c.detail;
      const scope = t(c.field === "output" ? "changes.scopeOutput" : "changes.scopeInput");
      const pct = `${c.change_pct > 0 ? "+" : ""}${Math.round(c.change_pct)}%`;
      return `${scope} $${c.old}→$${c.new} (${pct})`;
    }
    case "intel_change": {
      if (c.old == null || c.new == null || c.change == null) return c.detail;
      const diff = `${c.change > 0 ? "+" : ""}${c.change}`;
      return `${t("changes.intelShort")} ${Math.round(c.old)}→${Math.round(c.new)} (${diff})`;
    }
    default:
      return c.detail;
  }
}

export interface ChangesData {
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

// 静态引入每日变化数据（构建期内联，文件由数据管线保证存在）
const changesData = changesJson as ChangesData;
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
  const data = changesData;

  if (data.changes.length === 0) return null;

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
                <Link
                  href={`/models/${c.id}`}
                  className="text-sm font-medium text-text-primary hover:text-accent-violet transition-colors truncate"
                >
                  {c.model}
                </Link>
                <span className="text-xs text-text-muted ml-2">{formatDetail(c, t)}</span>
                {c.type === "new" && c.first_seen && c.first_seen !== data.date && (
                  <span className="text-xs text-amber-500 ml-2">{t("changes.firstSeen", { date: c.first_seen })}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
