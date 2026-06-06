"use client";

import { useMemo } from "react";
import Link from "next/link";
import { GitBranch } from "lucide-react";
import { type ModelWithScores, getAllModels } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SimilarModelsProps {
  model: ModelWithScores;
}

const MAX_CARDS = 4;

/**
 * Find similar models — sibling products from the same company first,
 * then same-tier models by intelligence score.
 * This transforms the detail page from "one model's data sheet"
 * into a decision hub where users can browse alternatives.
 */
export function SimilarModels({ model }: SimilarModelsProps) {
  const { t } = useTranslation();

  const similar = useMemo(() => {
    const all = getAllModels().filter((m) => m.id !== model.id);
    const intel = model.raw.intelligence;

    // Score each candidate by similarity
    const scored = all.map((m) => {
      let score = 0;

      // Priority 1: Same company (strongest signal)
      if (m.company === model.company) {
        score += 10;
      }

      // Priority 2: Same intelligence tier (±8 points)
      if (intel != null && m.raw.intelligence != null) {
        const delta = Math.abs(m.raw.intelligence - intel);
        if (delta <= 3) score += 5;
        else if (delta <= 8) score += 3;
      }

      // Priority 3: Same type (open source / closed)
      if (m.type === model.type) score += 2;

      // Priority 4: Same flags
      if (m.flags.reasoning === model.flags.reasoning) score += 1;
      if (m.flags.frontier === model.flags.frontier) score += 1;
      if (m.flags.open_weights === model.flags.open_weights) score += 1;
      if (m.flags.image_input === model.flags.image_input) score += 0.5;
      if (m.flags.chinese_eval === model.flags.chinese_eval) score += 0.5;

      return { model: m, score };
    });

    // Sort by score descending, then by intelligence descending for ties
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.model.raw.intelligence ?? 0) - (a.model.raw.intelligence ?? 0);
    });

    return scored.slice(0, MAX_CARDS).map((s) => s.model);
  }, [model]);

  if (similar.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="h-4 w-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">
          {t("product.similarModels")}
        </h3>
        <span className="text-xs text-text-muted">
          {t("product.similarModelsDesc")}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {similar.map((m) => (
          <Link
            key={m.id}
            href={`/product/${m.id}`}
            className="rounded-xl border border-surface-border bg-surface-card p-3 sm:p-4 transition-all duration-200 hover:border-accent-violet/30 hover:shadow-md hover:-translate-y-0.5 group"
          >
            {/* Logo + Name row */}
            <div className="flex items-start gap-2.5 mb-2">
              <div className="h-8 w-8 rounded shrink-0 bg-surface-base flex items-center justify-center overflow-hidden">
                {m.logo ? (
                  <img
                    src={m.logo}
                    alt=""
                    className="h-6 w-6 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-xs font-bold text-text-muted">
                    {m.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text-primary truncate group-hover:text-accent-violet transition-colors">
                  {m.name}
                </div>
                <div className="text-xs text-text-muted truncate">
                  {m.company}
                </div>
              </div>
            </div>

            {/* Intelligence score */}
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-accent-violet">
                {m.raw.intelligence?.toFixed(1) ?? "—"}
              </span>
              <span className="text-xs text-text-muted">{t("models.colIntelligence")}</span>
            </div>

            {/* Type badge */}
            <div className="mt-1.5">
              <span className={cn(
                "inline-block text-[10px] font-medium px-1.5 py-0.5 rounded",
                m.type === "开源"
                  ? "bg-accent-lime/10 text-accent-lime"
                  : "bg-accent-violet/10 text-accent-violet"
              )}>
                {m.type}
              </span>
            </div>

            {/* Price hint (blended) */}
            {m.raw.blended != null && (
              <div className="mt-1 text-[10px] text-text-muted">
                ${m.raw.blended.toFixed(2)}/M
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
