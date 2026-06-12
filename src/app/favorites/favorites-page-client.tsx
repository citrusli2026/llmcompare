"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { RankingTable } from "@/components/ranking-table";
import { CompareBar } from "@/components/compare-bar";
import { FavoriteButton } from "@/components/favorite-button";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { getAllModels } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Heart, SearchX, Trash2, ArrowLeftRight } from "lucide-react";

export default function FavoritesPageClient() {
  const { t } = useTranslation();
  const { favorites, clearFavorites } = useFavorites();
  const [compareActive, setCompareActive] = useState(false);
  const { selectedModels, isInCompare, isAtMax, toggleCompare, removeCompare, clearCompare, maxCompare } = useCompareIds();

  const handleToggleCompareMode = useCallback(() => {
    setCompareActive((prev) => {
      if (prev) clearCompare();
      return !prev;
    });
  }, [clearCompare]);

  const allModels = useMemo(() => getAllModels(), []);
  const favoritedModels = useMemo(
    () => favorites
      .map((id) => allModels.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => m != null),
    [favorites, allModels],
  );

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <div className="px-4 py-6 sm:py-12 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-4 sm:mb-8 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2 sm:mb-4">
                <Heart className="h-7 w-7 sm:h-8 sm:w-8 text-accent-fuchsia fill-accent-fuchsia" />
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{t("favorites.title")}</h1>
              </div>
              <p className="hidden sm:block text-text-secondary">
                {favoritedModels.length > 0
                  ? t("favorites.count", { n: String(favoritedModels.length) })
                  : t("favorites.emptyHint")}
              </p>
            </div>
            {favoritedModels.length > 0 && (
              <div className="flex items-center gap-2 shrink-0 mt-1">
                <button
                  onClick={handleToggleCompareMode}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border transition-all",
                    compareActive
                      ? "border-accent-violet bg-accent-violet/10 text-accent-violet"
                      : "border-surface-border bg-surface-card text-text-secondary hover:border-accent-violet/30 hover:text-accent-violet"
                  )}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {t(compareActive ? "compare.modeOn" : "compare.startCompare")}
                </button>
                <button
                  onClick={() => {
                    if (confirm(t("favorites.clear") + "?")) clearFavorites();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs font-medium text-text-secondary hover:border-accent-fuchsia/30 hover:text-accent-fuchsia hover:bg-accent-fuchsia/5 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("favorites.clear")}
                </button>
              </div>
            )}
          </div>

          {favoritedModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-elevated border border-surface-border">
                <SearchX className="h-7 w-7 text-text-muted" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-1">{t("favorites.empty")}</h3>
              <p className="text-sm text-text-secondary max-w-sm mb-6">{t("favorites.emptyHint")}</p>
              <Link
                href="/models"
                className="inline-flex items-center gap-2 rounded-lg bg-accent-violet px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-accent-violet)] hover:bg-accent-violet/90 transition-colors"
              >
                {t("nav.models")}
              </Link>
            </div>
          ) : (
            <>
              {/* Quick chips */}
              <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
                {favoritedModels.map((m) => (
                  <Link
                    key={m.id}
                    href={`/models/${m.id}`}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card pl-1.5 pr-2 py-1 text-xs transition-all hover:border-accent-fuchsia/30 hover:bg-accent-fuchsia/5"
                  >
                    {m.logo && (
                      <img src={m.logo} alt="" className="h-4 w-4 rounded shrink-0" />
                    )}
                    <span className="font-medium text-text-primary group-hover:text-accent-fuchsia">{m.name}</span>
                    <FavoriteButton modelId={m.id} size="sm" className="h-5 w-5 border-0 bg-transparent hover:bg-transparent" />
                  </Link>
                ))}
              </div>

              <RankingTable
                models={favoritedModels}
                initialSortKey="intelligence"
                compare={{ isInCompare, isAtMax, onToggle: toggleCompare, active: compareActive }}
              />
            </>
          )}
        </div>
      </div>

      <CompareBar
        selectedModels={selectedModels}
        onRemoveModel={removeCompare}
        onClear={clearCompare}
        maxCompare={maxCompare}
        active={compareActive}
        onToggleActive={handleToggleCompareMode}
      />
    </div>
  );
}
