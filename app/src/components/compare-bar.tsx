"use client";

import { X, ArrowLeftRight, ArrowRight, CheckSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { type ModelWithScores } from "@/lib/scoring";
import { ModelLogo } from "@/components/model-logo";

interface CompareBarProps {
  selectedModels: ModelWithScores[];
  onRemoveModel: (id: string) => void;
  onClear: () => void;
  maxCompare: number;
  active: boolean;
  onToggleActive: () => void;
}

/**
 * Floating compare bar — compare mode toggle + selected models + CTA.
 * Shows when compare mode is active (even with 0 selections).
 * Desktop: fixed bottom. Mobile: fixed bottom.
 */
export function CompareBar({ selectedModels, onRemoveModel, onClear, maxCompare, active, onToggleActive }: CompareBarProps) {
  const router = useRouter();
  const { t } = useTranslation();

  if (!active) return null;

  const compareNow = () => {
    const ids = selectedModels.map((m) => m.id).join(",");
    router.push(`/compare?models=${ids}`);
  };

  return (
    <>
      {/* Mobile: fixed bottom */}
      <div
        data-testid="compare-bar"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-surface-border bg-surface-base/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
      >
        <div className="px-3 py-2 flex items-center gap-2">
          <button
            onClick={onToggleActive}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-accent-violet/30 bg-accent-violet/10 text-accent-violet px-2 py-1.5 text-[11px] font-medium"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {t("compare.modeOn")}
          </button>

          {selectedModels.length === 0 ? (
            <span className="flex-1 text-center text-[11px] text-text-muted">
              {t("compare.tapToSelect")}
            </span>
          ) : (
            <>
              <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
                {selectedModels.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center gap-1 shrink-0 rounded-md border border-surface-border bg-surface-card pl-1.5 pr-1 py-1 text-[11px]"
                  >
                    <ModelLogo src={model.logo} name={model.name} size="xs" />
                    <span className="font-medium text-text-primary truncate max-w-[60px]">
                      {model.name}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveModel(model.id); }}
                      className="shrink-0 rounded p-0.5 text-text-muted hover:text-text-primary"
                      aria-label={t("compare.remove")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              {selectedModels.length >= 2 && (
                <button
                  onClick={compareNow}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md bg-accent-violet text-white px-2.5 py-1.5 text-xs font-medium hover:bg-violet-600 transition-colors"
                >
                  {t("compare.compareNowShort", { n: String(selectedModels.length) })}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Desktop: fixed bottom */}
      <div
        data-testid="compare-bar"
        className="hidden sm:block fixed bottom-0 left-0 right-0 z-50 border-t border-surface-border bg-surface-base/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleActive}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-accent-violet/30 bg-accent-violet/10 text-accent-violet px-3 py-1.5 text-xs font-medium hover:bg-accent-violet/20 transition-colors"
            >
              <CheckSquare className="h-4 w-4" />
              {t("compare.modeOn")}
            </button>

            {selectedModels.length === 0 ? (
              <span className="text-sm text-text-muted">
                {t("compare.clickToSelect")}
              </span>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-text-secondary shrink-0">
                  <ArrowLeftRight className="h-4 w-4 text-accent-violet" />
                  <span>
                    {t("compare.selected", { n: String(selectedModels.length) })}
                    <span className="text-text-muted text-xs ml-1">/ {maxCompare}</span>
                  </span>
                </div>

                <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-thin py-1">
                  {selectedModels.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center gap-1.5 shrink-0 rounded-lg border border-surface-border bg-surface-card px-2.5 py-1.5 text-xs"
                    >
                      <ModelLogo src={model.logo} name={model.name} size="xs" />
                      <span className="font-medium text-text-primary truncate max-w-[120px]">
                        {model.name}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveModel(model.id); }}
                        className="shrink-0 rounded p-0.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                        aria-label={t("compare.remove")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={onClear}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1.5"
                  >
                    {t("compare.clear")}
                  </button>
                  {selectedModels.length >= 2 && (
                    <button
                      onClick={compareNow}
                      className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-accent-violet text-white hover:bg-violet-600 transition-all"
                    >
                      {t("compare.compareNow", { n: String(selectedModels.length) })}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
