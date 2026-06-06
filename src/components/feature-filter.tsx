"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export type FeatureKey = "frontier" | "reasoning" | "image_input" | "chinese_eval" | "open_weights";

const FEATURES: { key: FeatureKey; labelKey: string }[] = [
  { key: "frontier", labelKey: "common.frontier" },
  { key: "reasoning", labelKey: "common.reasoning" },
  { key: "image_input", labelKey: "common.imageInput" },
  { key: "chinese_eval", labelKey: "common.chineseEval" },
  { key: "open_weights", labelKey: "common.openWeights" },
];

interface FeatureFilterProps {
  activeKeys: Set<FeatureKey>;
  onToggle: (key: FeatureKey) => void;
}

export function FeatureFilter({ activeKeys, onToggle }: FeatureFilterProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      {FEATURES.map(({ key, labelKey }) => {
        const isActive = activeKeys.has(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all min-h-9",
              isActive
                ? "bg-accent-violet/20 text-accent-violet border border-accent-violet/40 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.15)]"
                : "bg-surface-card text-text-secondary border border-surface-border hover:bg-surface-hover hover:text-text-primary"
            )}
          >
            <span className="flex items-center gap-1.5">
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-accent-violet shrink-0" />}
              {t(labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
