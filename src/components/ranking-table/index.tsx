"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { ModelWithScores } from "@/lib/scoring";

import { HEADERS, MOBILE_SORT_OPTIONS } from "./utils/constants";
import { useSortedModels, type SortKey } from "./hooks/use-sorting";
import { usePercentiles } from "./hooks/use-percentiles";
import { DesktopTableRow } from "./components/desktop-table-row";
import { MobileCard } from "./components/mobile-card";

interface RankingTableProps {
  models: ModelWithScores[];
}

export function RankingTable({ models }: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDesc, setSortDesc] = useState(true);
  const { t } = useTranslation();

  const { sortedIntl, sortedFrontier, sortedMainstream, frontierCount } = useSortedModels({
    models,
    sortKey,
    sortDesc,
  });

  const percentiles = usePercentiles(models);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
      return;
    }
    setSortKey(key);
    setSortDesc(true);
  };

  const handleMobileSortChange = (value: string) => {
    if (value === "" || value === "date") {
      setSortKey("date");
      setSortDesc(true);
    } else {
      setSortKey(value as SortKey);
      setSortDesc(true);
    }
  };

  const colVisibilityClass = (h: (typeof HEADERS)[number]) =>
    cn(!h.mobile && "hidden sm:table-cell", !h.desktop && "hidden md:table-cell");

  return (
    <div className="space-y-4">
      <div className="block sm:hidden">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={sortKey ?? ""}
              onChange={(e) => handleMobileSortChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-surface-border bg-surface-card px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
            >
              {MOBILE_SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
            <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          </div>
          {sortKey && (
            <button
              onClick={() => setSortDesc(!sortDesc)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-card text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              aria-label={sortDesc ? t("models.sortDesc") : t("models.sortAsc")}
            >
              {sortDesc ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-surface-border hover:bg-transparent">
                <TableHead className="text-text-muted">{t("table.model")}</TableHead>
                <TableHead className="text-text-muted hidden sm:table-cell">
                  {t("table.company")}
                </TableHead>

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
                {HEADERS.map((h) => (
                  <TableHead
                    key={h.key}
                    className={cn(
                      "cursor-pointer text-text-muted hover:text-text-primary",
                      colVisibilityClass(h)
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
              {sortedIntl.map((model) => (
                <DesktopTableRow
                  key={model.id}
                  model={model}
                  variant="intl"
                  sortKey={sortKey}
                  percentiles={percentiles}
                />
              ))}
              {sortedFrontier.map((model, idx) => (
                <DesktopTableRow
                  key={model.id}
                  model={model}
                  rank={idx + 1}
                  variant="frontier"
                  sortKey={sortKey}
                  percentiles={percentiles}
                />
              ))}
              {sortedMainstream.map((model, idx) => (
                <DesktopTableRow
                  key={model.id}
                  model={model}
                  rank={frontierCount + idx + 1}
                  variant="mainstream"
                  sortKey={sortKey}
                  percentiles={percentiles}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="block sm:hidden space-y-2">
        {sortedIntl.slice(0, 1).map((model) => (
          <MobileCard
            key={model.id}
            model={model}
            variant="intl"
            percentiles={percentiles}
          />
        ))}
        {sortedFrontier.map((model, idx) => (
          <MobileCard
            key={model.id}
            model={model}
            rank={idx + 1}
            variant="frontier"
            percentiles={percentiles}
          />
        ))}
        {sortedMainstream.map((model, idx) => (
          <MobileCard
            key={model.id}
            model={model}
            rank={frontierCount + idx + 1}
            variant="mainstream"
            percentiles={percentiles}
          />
        ))}
      </div>
    </div>
  );
}
