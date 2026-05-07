"use client";

import { Badge } from "@/components/ui/badge";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface ModelHeaderProps {
  model: ModelWithScores;
}

export function ModelHeader({ model }: ModelHeaderProps) {
  const { t } = useTranslation();
  const f = model.flags;

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-elevated border border-surface-border text-2xl font-semibold text-text-primary shrink-0">
          {model.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{model.name}</h1>
            <Badge
              variant={model.type === "开源" ? "default" : "secondary"}
              className={
                model.type === "开源"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-300"
              }
            >
              {t(model.type === "开源" ? "common.open" : "common.closed")}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {f.frontier && (
              <Badge className="bg-violet-500/10 text-violet-400 text-xs">{t("common.frontier")}</Badge>
            )}
            {f.reasoning && (
              <Badge className="bg-amber-500/10 text-amber-400 text-xs">{t("common.reasoning")}</Badge>
            )}
            {f.open_weights && (
              <Badge className="bg-emerald-500/10 text-emerald-400 text-xs">{t("common.openWeights")}</Badge>
            )}
            {f.image_input && (
              <Badge className="bg-cyan-500/10 text-cyan-400 text-xs">{t("common.imageInput")}</Badge>
            )}
            {f.chinese_eval && (
              <Badge className="bg-blue-500/10 text-blue-400 text-xs">{t("common.chineseEval")}</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
