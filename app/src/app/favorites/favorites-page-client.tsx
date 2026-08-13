"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { RankingTable } from "@/components/ranking-table";
import { CompareBar } from "@/components/compare-bar";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { getAllModels } from "@/lib/scoring";
import { decodeIds, filterValidIds, encodeIds } from "@/lib/favorites-share";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Heart, SearchX, Trash2, ArrowLeftRight, Share2, Import, Undo2 } from "lucide-react";
import { ModelLogo } from "@/components/model-logo";

export default function FavoritesPageClient() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { favorites, clearFavorites, mergeFavorites } = useFavorites();
  const [compareActive, setCompareActive] = useState(false);
  const { selectedModels, isInCompare, isAtMax, toggleCompare, removeCompare, clearCompare, maxCompare } = useCompareIds();

  const handleToggleCompareMode = useCallback(() => {
    setCompareActive((prev) => {
      if (prev) clearCompare();
      return !prev;
    });
  }, [clearCompare]);

  const allModels = useMemo(() => getAllModels(), []);
  const validIds = useMemo(() => new Set(allModels.map((m) => m.id)), [allModels]);

  // ── 分享视图：?ids=a,b,c 存在时展示他人分享的列表（只读 + 一键导入）──
  const sharedParam = searchParams.get("ids");
  const isSharedView = sharedParam != null;
  const sharedModels = useMemo(() => {
    if (!isSharedView) return [];
    const ids = filterValidIds(decodeIds(sharedParam), validIds);
    return ids
      .map((id) => allModels.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => m != null);
  }, [isSharedView, sharedParam, validIds, allModels]);

  const exitSharedView = useCallback(() => {
    router.replace("/favorites", { scroll: false });
  }, [router]);

  const handleImport = useCallback(() => {
    mergeFavorites(sharedModels.map((m) => m.id));
    router.replace("/favorites", { scroll: false });
  }, [mergeFavorites, sharedModels, router]);

  const favoritedModels = useMemo(
    () => favorites
      .map((id) => allModels.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => m != null),
    [favorites, allModels],
  );

  // 分享链接：/favorites?ids=…（SSR 时用相对地址，点击发生在客户端 hydration 之后）
  const shareUrl = `${
    typeof window === "undefined" ? "" : window.location.origin
  }/favorites?ids=${encodeIds(favorites)}`;

  if (isSharedView) {
    return (
      <div className="min-h-screen bg-surface-base">
        <Navbar />

        <div className="px-4 py-6 sm:py-12 sm:px-6 lg:px-8 pb-20">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-4 sm:mb-8 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3 mb-2 sm:mb-4">
                  <Share2 className="h-7 w-7 sm:h-8 sm:w-8 text-accent-violet" />
                  <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{t("favorites.sharedTitle")}</h1>
                </div>
                <p className="hidden sm:block text-text-secondary">
                  {sharedModels.length > 0
                    ? t("favorites.sharedHint", { n: String(sharedModels.length) })
                    : t("favorites.sharedEmptyHint")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 mt-1">
                {sharedModels.length > 0 && (
                  <button
                    onClick={handleImport}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent-violet px-3 py-2 text-xs font-semibold text-white shadow-[var(--shadow-accent-violet)] hover:bg-accent-violet/90 transition-all"
                  >
                    <Import className="h-3.5 w-3.5" />
                    {t("favorites.import")}
                  </button>
                )}
                <button
                  onClick={exitSharedView}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs font-medium text-text-secondary hover:border-accent-violet/30 hover:text-accent-violet transition-all"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  {t("favorites.backToMine")}
                </button>
              </div>
            </div>

            {sharedModels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-elevated border border-surface-border">
                  <SearchX className="h-7 w-7 text-text-muted" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">{t("favorites.sharedEmpty")}</h3>
                <p className="text-sm text-text-secondary max-w-sm mb-6">{t("favorites.sharedEmptyHint")}</p>
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
                  {sharedModels.map((m) => (
                    <Link
                      key={m.id}
                      href={`/models/${m.id}`}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card pl-1.5 pr-2 py-1 text-xs transition-all hover:border-accent-violet/30 hover:bg-accent-violet/5"
                    >
                      {m.logo && (
                        <ModelLogo src={m.logo} name={m.name} size="xs" />
                      )}
                      <span className="font-medium text-text-primary group-hover:text-accent-violet">{m.name}</span>
                    </Link>
                  ))}
                </div>

                <RankingTable
                  models={sharedModels}
                  initialSortKey="intelligence"
                />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <ShareButton
                url={shareUrl}
                disabled={favoritedModels.length === 0}
                size="sm"
                className="h-auto px-3 py-2 text-xs"
              />
              {favoritedModels.length > 0 && (
                <>
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
                </>
              )}
            </div>
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
              {/* Quick chips — 收藏按钮与链接并列, 避免 button 嵌套在 anchor 内 (非法 HTML) */}
              <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
                {favoritedModels.map((m) => (
                  <span
                    key={m.id}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card pl-1.5 pr-2 py-1 text-xs transition-all hover:border-accent-fuchsia/30 hover:bg-accent-fuchsia/5"
                  >
                    <Link href={`/models/${m.id}`} className="inline-flex items-center gap-1.5">
                      {m.logo && (
                        <ModelLogo src={m.logo} name={m.name} size="xs" />
                      )}
                      <span className="font-medium text-text-primary group-hover:text-accent-fuchsia">{m.name}</span>
                    </Link>
                    <FavoriteButton modelId={m.id} size="sm" className="h-5 w-5 border-0 bg-transparent hover:bg-transparent" />
                  </span>
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
