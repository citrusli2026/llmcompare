"use client";

import { AlertCircle, ExternalLink } from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface DataCompletionCalloutProps {
  model: ModelWithScores;
}

const COMPLETABLE_FIELDS = [
  { key: "knowledge_cutoff", labelKey: "product.knowledgeCutoff" },
  { key: "context_window", labelKey: "product.contextWindow" },
  { key: "parameters", labelKey: "product.parameters" },
  { key: "release_date", labelKey: "product.releaseDate" },
  { key: "license", labelKey: "product.license" },
] as const;

function buildIssueUrl(model: ModelWithScores, missingLabels: string[]): string {
  const title = encodeURIComponent(`[数据补全] ${model.company} ${model.name}`);
  const body = encodeURIComponent(
    `模型：${model.name}\n厂商：${model.company}\n页面：https://www.llmcompare.cc/models/${model.id}\n\n待补全字段：\n${missingLabels.map((l) => `- [ ] ${l}`).join("\n")}\n\n请提供来源链接或截图，谢谢！`
  );
  return `https://github.com/citrusli2026/llmcompare/issues/new?title=${title}&body=${body}`;
}

export function DataCompletionCallout({ model }: DataCompletionCalloutProps) {
  const { t } = useTranslation();
  const r = model.raw;

  const missing = COMPLETABLE_FIELDS.filter((f) => {
    const value = r[f.key as keyof typeof r];
    return value == null || value === "";
  });

  if (missing.length === 0) return null;

  const missingLabels = missing.map((f) => t(f.labelKey));
  const issueUrl = buildIssueUrl(model, missingLabels);

  return (
    <div className="mb-6 rounded-lg border border-accent-amber/20 bg-accent-amber/5 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-accent-amber mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {t("product.dataCompletionTitle")}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {t("product.dataCompletionDesc", { fields: missingLabels.join("、") })}
          </p>
          <a
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent-amber/10 px-3 py-1.5 text-xs font-medium text-accent-amber hover:bg-accent-amber/20 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            {t("product.dataCompletionCta")}
          </a>
        </div>
      </div>
    </div>
  );
}
