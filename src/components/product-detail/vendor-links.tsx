"use client";

import { ExternalLink } from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface VendorLinksProps {
  model: ModelWithScores;
}

export function VendorLinks({ model }: VendorLinksProps) {
  const { t } = useTranslation();

  if (!model.vendor_links || !Object.values(model.vendor_links).some(Boolean)) {
    return null;
  }

  const links: [string | undefined, string][] = [
    [model.vendor_links.homepage, t("product.homepage")],
    [model.vendor_links.api_docs, t("product.apiDocs")],
    [model.vendor_links.console, t("product.console")],
    [model.vendor_links.huggingface, t("product.huggingface")],
    [model.vendor_links.github, t("product.github")],
    [model.vendor_links.pricing_doc, t("product.pricingDoc")],
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-6">
      {links
        .filter(([url]) => url)
        .map(([url, label]) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs bg-surface-hover border border-surface-border text-text-secondary hover:text-text-primary hover:border-accent-violet/30 transition-colors"
          >
            <ExternalLink className="h-3 w-3" /> {label}
          </a>
        ))}
      <a
        href={model.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs bg-surface-hover border border-surface-border text-text-secondary hover:text-text-primary hover:border-accent-violet/30 transition-colors"
      >
        {t("product.dataSource")}
      </a>
    </div>
  );
}
