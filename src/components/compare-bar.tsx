"use client";

import { X, BarChart3, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { type ModelWithScores } from "@/lib/scoring";
import { MAX_COMPARE } from "@/hooks/use-compare-ids";

interface CompareBarProps {
  selectedModels: ModelWithScores[];
  onRemoveModel: (id: string) => void;
  onClear: () => void;
}

export function CompareBar({
  selectedModels,
  onRemoveModel,
  onClear,
}: CompareBarProps) {
  const router = useRouter();
  const { t } = useTranslation();

  if (selectedModels.length === 0) return null;

  return (
    <div data-testid="compare-bar" className="fixed bottom-0 left-0 right-0 z-50 border-t border-surface-border bg-surface-base/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Icon + Count */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-text-secondary shrink-0">
            <BarChart3 className="h-5 w-5 text-accent-violet" />
            <span>
              {t("compare.selected", { n: String(selectedModels.length) })}
              <span className="text-text-muted text-xs ml-1">
                / {MAX_COMPARE}
              </span>
            </span>
          </div>

          {/* Selected Models */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-thin py-1">
            {selectedModels.map((model) => (
              <div
                key={model.id}
                className="flex items-center gap-1.5 shrink-0 rounded-lg border border-surface-border bg-surface-card px-2.5 py-1.5 text-xs"
              >
                <span className="font-medium text-text-primary truncate max-w-[100px] sm:max-w-[140px]">
                  {model.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveModel(model.id);
                  }}
                  className="shrink-0 rounded p-0.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                  aria-label={t("compare.remove")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClear}
              className="hidden sm:inline-flex text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1.5"
            >
              {t("compare.remove")}
            </button>
            <button
              onClick={() => {
                const ids = selectedModels.map((m) => m.id).join(",");
                router.push(`/compare?models=${ids}`);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                "bg-accent-violet text-white hover:bg-violet-600"
              )}
            >
              {t("compare.compareNow", { n: String(selectedModels.length) })}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
