"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import type { ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface ProductCardProps {
  product: ModelWithScores;
}

export function ProductCard({ product }: ProductCardProps) {
  const f = product.flags;
  const r = product.raw;
  const { t } = useTranslation();

  return (
    <Link href={`/models/${product.id}`}>
      <div className="group relative rounded-xl border border-surface-border bg-surface-card p-5 transition-all hover:bg-surface-hover hover:border-accent-violet/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-lg font-bold text-text-primary">
              {product.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-text-primary group-hover:text-accent-violet transition-colors">
                {product.name}
              </h3>
              <p className="text-sm text-text-secondary">{product.company}</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-text-muted group-hover:text-text-primary transition-colors" />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {f.frontier && (
            <Badge variant="secondary" className="bg-violet-500/10 text-violet-400 text-xs">{t("common.frontier")}</Badge>
          )}
          {f.open_weights && (
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 text-xs">{t("common.openWeights")}</Badge>
          )}
          {f.image_input && (
            <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 text-xs">{t("common.imageInput")}</Badge>
          )}
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">{t("product.intelligence")}</span>
            <span className="font-medium text-text-primary">{r.intelligence}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">{t("product.coding")}</span>
            <span className="font-medium text-text-primary">{r.coding ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">{t("models.colSpeed")}</span>
            <span className="font-medium text-text-primary">{r.median_tps != null ? <>{r.median_tps.toFixed(1)} <span className="text-text-dim text-[10px]">TPS</span></> : "—"}</span>
          </div>
        </div>

        <div className="mt-4 text-xs text-text-muted">
          <span>{r.display}</span>
        </div>
      </div>
    </Link>
  );
}
