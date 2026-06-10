"use client";

import { PlayCircle, Globe, BookOpen } from "lucide-react";
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
  const tertiary = links?.api_docs;

  if (!primary && !secondary && !tertiary) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6" data-testid="cta-group">
      {primary && (
        <a
          href={primary}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="console"
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-violet px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-accent-violet)] hover:bg-accent-violet/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
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
          className="flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-3 text-sm font-medium text-text-primary hover:border-accent-violet/40 hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
        >
          <Globe className="h-4 w-4" />
          {t("product.visitHomepage")}
        </a>
      )}
      {tertiary && (
        <a
          href={tertiary}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="api_docs"
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
        >
          <BookOpen className="h-4 w-4" />
          {t("product.viewApiDocs")}
        </a>
      )}
    </div>
  );
}
