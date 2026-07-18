"use client";

import { PlayCircle, Globe } from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface CtaGroupProps {
  model: ModelWithScores;
}

export function CtaGroup({ model }: CtaGroupProps) {
  const { t } = useTranslation();
  const links = model.vendor_links;

  const primary = links?.console;
  const secondary = links?.homepage;

  if (!primary && !secondary) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6" data-testid="cta-group">
      {primary && (
        <a
          href={primary}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="console"
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-violet to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-violet/25 hover:shadow-xl hover:shadow-accent-violet/30 hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
        >
          <PlayCircle className="h-4 w-4" />
          {t("product.tryIt")}
        </a>
      )}
      {secondary && (
        <a
          href={secondary}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="homepage"
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-accent-violet/30 bg-accent-violet/5 px-4 py-3 text-sm font-semibold text-accent-violet hover:bg-accent-violet/10 hover:border-accent-violet/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
        >
          <Globe className="h-4 w-4" />
          {t("product.visitHomepage")}
        </a>
      )}
    </div>
  );
}
