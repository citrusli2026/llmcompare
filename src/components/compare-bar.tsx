"use client";

import { X, BarChart3, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, formatTokenCount } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { type ModelWithScores } from "@/lib/scoring";
import { ModelLogo } from "@/components/model-logo";

interface CompareBarProps {
  selectedModels: ModelWithScores[];
  onRemoveModel: (id: string) => void;
  onClear: () => void;
  maxCompare: number;
}

/**
 * Floating compare bar — shows selected models + CTA.
 * Desktop: sticky bottom. Mobile: sticky top.
 */
export function CompareBar({ selectedModels, onRemoveModel, onClear, maxCompare }: CompareBarProps) {
  const router = useRouter();
  const { t } = useTranslation();

  if (selectedModels.length === 0) return null;

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
          <BarChart3 className="h-4 w-4 text-accent-violet shrink-0" />
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
          <button
            onClick={compareNow}
            className="shrink-0 inline-flex items-center gap-1 rounded-md bg-accent-violet text-white px-2.5 py-1.5 text-xs font-medium hover:bg-violet-600 transition-colors"
          >
            {t("compare.compareNowShort", { n: String(selectedModels.length) })}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Desktop: sticky bottom */}
      <div
        data-testid="compare-bar"
        className="hidden sm:block fixed bottom-0 left-0 right-0 z-50 border-t border-surface-border bg-surface-base/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-text-secondary shrink-0">
              <BarChart3 className="h-5 w-5 text-accent-violet" />
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
                {t("compare.remove")}
              </button>
              <button
                onClick={compareNow}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-accent-violet text-white hover:bg-violet-600 transition-all"
              >
                {t("compare.compareNow", { n: String(selectedModels.length) })}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
