"use client";

import { useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { CompareTable } from "@/components/compare-table";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { Globe } from "lucide-react";

interface Props {
  models: ModelWithScores[];
}

const USD_CNY_RATE = 7.2;

export default function ComparePageClient({ models }: Props) {
  const { t } = useTranslation();

  const { international, domestic } = useMemo(() => {
    const intl = models.filter((m) => m.raw.isInternational);
    const dom = models.filter((m) => !m.raw.isInternational);
    return { international: intl, domestic: dom };
  }, [models]);

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-8 w-8 text-accent-violet" />
              <h1 className="text-3xl font-bold text-text-primary">{t("compare.title")}</h1>
            </div>
            <p className="text-text-secondary">{t("compare.desc")}</p>
          </div>

          <CompareTable
            international={international}
            domestic={domestic}
            exchangeRate={USD_CNY_RATE}
          />
        </div>
      </div>
    </div>
  );
}
