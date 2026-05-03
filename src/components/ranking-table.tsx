"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Zap, DollarSign, Brain, Code, Bot, ArrowUpRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface RankingTableProps {
  models: ModelWithScores[];
}

type ScoreKey = "intelligence" | "coding" | "agentic" | "speed" | "cost";
type SortKey = ScoreKey | "date";

const HEADERS: { key: ScoreKey; labelKey: string; icon: React.ComponentType<any>; mobile: boolean; desktop: boolean }[] = [
  { key: "intelligence", labelKey: "models.colIntelligence", icon: Brain, mobile: true, desktop: true },
  { key: "coding", labelKey: "models.colCoding", icon: Code, mobile: false, desktop: true },
  { key: "agentic", labelKey: "models.colAgentic", icon: Bot, mobile: false, desktop: true },
  { key: "speed", labelKey: "models.colSpeed", icon: Zap, mobile: false, desktop: true },
  { key: "cost", labelKey: "models.colCost", icon: DollarSign, mobile: false, desktop: true },
];

export function RankingTable({ models }: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDesc, setSortDesc] = useState(true);
  const { t } = useTranslation();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortDesc(!sortDesc); }
    else if (sortKey === null && key === "date") { setSortKey(key); setSortDesc(false); }
    else { setSortKey(key); setSortDesc(true); }
  };

  const getRawValue = (model: ModelWithScores, key: SortKey): number => {
    switch (key) {
      case "intelligence": return model.raw.intelligence;
      case "coding": return model.raw.coding ?? -1;
      case "agentic": return model.raw.agentic ?? -1;
      case "speed": return model.raw.median_tps ?? -1;
      case "cost": return model.raw.blended ?? -1;
      case "date": return -1; // handled in sortedModels
    }
  };

  const sortedModels = [...models].sort((a, b) => {
    if (sortKey === null || sortKey === "date") {
      const aDate = a.raw.release_date ?? "";
      const bDate = b.raw.release_date ?? "";
      return sortDesc ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
    }
    const aVal = getRawValue(a, sortKey);
    const bVal = getRawValue(b, sortKey);
    return sortDesc ? bVal - aVal : aVal - bVal;
  });

  const formatScore = (val: number | null | undefined) => {
    if (val === null || val === undefined || val === -1) return <span className="text-text-dim text-xs">—</span>;
    return val % 1 === 0 ? val : val.toFixed(1);
  };

  const getScoreColor = (val: number | null | undefined, key: SortKey) => {
    if (val === null || val === undefined || val === -1) return "text-text-dim";
    // Speed (TPS) - higher is better
    if (key === "speed") {
      if (val >= 150) return "text-emerald-500 dark:text-emerald-400";
      if (val >= 80) return "text-blue-500 dark:text-blue-300";
      if (val >= 40) return "text-amber-500 dark:text-amber-300";
      return "text-red-500 dark:text-red-400";
    }
    // Cost - lower is better (blended price)
    if (key === "cost") {
      if (val <= 0.5) return "text-emerald-500 dark:text-emerald-400";
      if (val <= 2) return "text-blue-500 dark:text-blue-300";
      if (val <= 5) return "text-amber-500 dark:text-amber-300";
      return "text-red-500 dark:text-red-400";
    }
    // Intelligence/coding/agentic - higher is better
    if (val >= 85) return "text-emerald-500 dark:text-emerald-400";
    if (val >= 70) return "text-blue-500 dark:text-blue-300";
    if (val >= 50) return "text-amber-500 dark:text-amber-300";
    return "text-red-500 dark:text-red-400";
  };

  const getDisplayValue = (model: ModelWithScores, key: SortKey): number | null => {
    const val = getRawValue(model, key);
    return val === -1 ? null : val;
  };

  const getSpeedDisplay = (model: ModelWithScores): React.ReactNode => {
    if (model.raw.median_tps != null) {
      return <span>{model.raw.median_tps.toFixed(1)} <span className="text-text-dim text-[10px]">TPS</span></span>;
    }
    return <span className="text-text-dim text-xs">—</span>;
  };

  const getCostDisplay = (model: ModelWithScores): React.ReactNode => {
    if (model.raw.cn_input != null && model.raw.cn_output != null) {
      return <span>¥{model.raw.cn_input}/¥{model.raw.cn_output}</span>;
    }
    if (model.raw.blended != null) {
      return <span>${model.raw.blended.toFixed(2)}/M</span>;
    }
    return <span className="text-text-dim text-xs">—</span>;
  };

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-surface-border hover:bg-transparent">
              <TableHead className="text-text-muted">{t("table.model")}</TableHead>
              <TableHead className="text-text-muted hidden sm:table-cell">{t("table.company")}</TableHead>
              <TableHead className="text-text-muted hidden md:table-cell">{t("table.type")}</TableHead>
              <TableHead
                className={cn(
                  "cursor-pointer text-text-muted hover:text-text-primary hidden lg:table-cell",
                  sortKey === "date" && "font-semibold text-text-primary"
                )}
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t("table.date")}
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              {HEADERS.map(h => (
                <TableHead
                  key={h.key}
                  className={cn(
                    "cursor-pointer text-text-muted hover:text-text-primary",
                    !h.mobile && "hidden sm:table-cell",
                    !h.desktop && "hidden md:table-cell",
                    !h.mobile && !h.desktop && "hidden lg:table-cell"
                  )}
                  onClick={() => handleSort(h.key)}
                >
                  <div className="flex items-center gap-1">
                    <h.icon className="h-3 w-3" />
                    {t(h.labelKey)}
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedModels.map((model) => {
              return (
                <TableRow key={model.id} className="border-surface-border hover:bg-surface-hover transition-colors">
                  <TableCell>
                    <Link href={`/product/${model.id}`} className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group">
                      {model.name}
                      <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100" />
                    </Link>
                    <div className="flex gap-1 mt-1">
                      {model.flags.frontier && (
                        <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-400 py-0 px-1.5">{t("common.frontier")}</Badge>
                      )}
                      {!model.flags.frontier && (
                        <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 py-0 px-1.5">{t("common.mainstream")}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-text-secondary hidden sm:table-cell">{model.company}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={model.type === "开源" ? "default" : "secondary"}
                      className={cn("text-xs", model.type === "开源"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-300")}>
                      {t(model.type === "开源" ? "common.open" : "common.closed")}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("hidden lg:table-cell text-sm", sortKey === "date" ? "font-semibold text-text-primary" : "text-text-secondary")}>
                    {model.raw.release_date ?? "—"}
                  </TableCell>
                  {HEADERS.map(h => (
                    <TableCell key={h.key}
                      className={cn(
                        "text-sm",
                        !h.mobile && "hidden sm:table-cell",
                        !h.desktop && "hidden md:table-cell",
                        !h.mobile && !h.desktop && "hidden lg:table-cell",
                        h.key === sortKey ? "font-semibold" : "",
                        h.key !== "cost" && getScoreColor(getDisplayValue(model, h.key), h.key)
                      )}>
                      {h.key === "cost" ? getCostDisplay(model) : h.key === "speed" ? getSpeedDisplay(model) : formatScore(getDisplayValue(model, h.key))}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
