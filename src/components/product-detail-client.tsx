"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ExternalLink, Calendar, Building2, Layers,
  DollarSign, Zap, BookOpen, Target, TrendingUp,
} from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface ProductDetailClientProps {
  model: ModelWithScores;
}

export function ProductDetailClient({ model }: ProductDetailClientProps) {
  const { t } = useTranslation();

  const r = model.raw;
  const f = model.flags;

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/models" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            {t("product.backLink")}
          </Link>

          {/* Header */}
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
                    className={model.type === "开源"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-300"}
                  >
                    {t(model.type === "开源" ? "common.open" : "common.closed")}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {f.frontier && <Badge className="bg-violet-500/10 text-violet-400 text-xs">{t("common.frontier")}</Badge>}
                  {f.reasoning && <Badge className="bg-amber-500/10 text-amber-400 text-xs">{t("common.reasoning")}</Badge>}
                  {f.open_weights && <Badge className="bg-emerald-500/10 text-emerald-400 text-xs">{t("common.openWeights")}</Badge>}
                  {f.image_input && <Badge className="bg-cyan-500/10 text-cyan-400 text-xs">{t("common.imageInput")}</Badge>}
                  {f.chinese_eval && <Badge className="bg-blue-500/10 text-blue-400 text-xs">{t("common.chineseEval")}</Badge>}
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Links - compact row at top */}
          {model.vendor_links && Object.values(model.vendor_links).some(Boolean) && (
            <div className="flex flex-wrap items-center gap-1.5 mb-6">
              <span className="text-xs text-text-muted mr-1">{t("product.vendorLinks")}:</span>
              {([
                [model.vendor_links.homepage, t("product.homepage")],
                [model.vendor_links.api_docs, t("product.apiDocs")],
                [model.vendor_links.console, t("product.console")],
                [model.vendor_links.huggingface, t("product.huggingface")],
                [model.vendor_links.pricing_doc, t("product.pricingDoc")],
              ] as const).filter(([url]) => url).map(([url, label]) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs bg-surface-hover border border-surface-border text-text-secondary hover:text-text-primary hover:border-accent-violet/30 transition-colors">
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
          )}

          {/* Quick Facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 rounded-xl border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-text-muted shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-text-muted">{t("product.company")}</p>
                <p className="text-sm font-medium text-text-primary truncate">{model.company}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Layers className="h-4 w-4 text-text-muted shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-text-muted">{t("product.level")}</p>
                <p className="text-sm font-medium text-text-primary truncate">{r.size_class ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-text-muted shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-text-muted">{t("product.contextWindow")}</p>
                <p className="text-sm font-medium text-text-primary truncate">{r.context_window != null ? `${(r.context_window / 1000).toFixed(0)}K` : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-text-muted shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-text-muted">{t("product.releaseDate")}</p>
                <p className="text-sm font-medium text-text-primary truncate">{r.release_date ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Benchmarks */}
              <div className="rounded-xl border border-surface-border bg-surface-card p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-5 flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent-amber" /> {t("product.benchmarkTitle")}
                </h2>

                {/* Primary metric: intelligence */}
                <div className="mb-5">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm text-text-secondary">{t("product.intelligence")}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-text-primary tabular-nums">{r.intelligence.toFixed(1)}</span>
                      <span className="text-xs text-text-muted">/100</span>
                    </div>
                  </div>
                  <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                      style={{ width: `${Math.min(Math.max(r.intelligence, 0), 100)}%` }}
                    />
                  </div>
                </div>

                {/* Secondary metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-surface-hover p-3">
                    <p className="text-xs text-text-muted">{t("product.coding")}</p>
                    <p className="text-base font-semibold text-text-primary tabular-nums">
                      {r.coding != null ? r.coding.toFixed(1) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-hover p-3">
                    <p className="text-xs text-text-muted">{t("product.agentic")}</p>
                    <p className="text-base font-semibold text-text-primary tabular-nums">
                      {r.agentic != null ? r.agentic.toFixed(1) : "—"}
                    </p>
                  </div>
                  {r.omniscience != null && (
                    <div className="rounded-lg bg-surface-hover p-3">
                      <p className="text-xs text-text-muted">{t("product.hallucinationControl")}</p>
                      <p className="text-base font-semibold text-text-primary tabular-nums">
                        {r.omniscience.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">{t("product.hallucinationNote")}</p>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-text-muted">{t("product.sourceAa")}</p>
              </div>

              {/* Speed Performance */}
              <div className="rounded-xl border border-surface-border bg-surface-card p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent-cyan" /> {t("product.speedTitle")}
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-surface-hover p-3">
                    <p className="text-xs text-text-muted">{t("product.medianTps")}</p>
                    <p className="text-lg font-semibold text-text-primary">{r.median_tps != null ? <>{r.median_tps.toFixed(1)} <span className="text-xs text-text-muted">TPS</span></> : "—"}</p>
                  </div>
                  <div className="rounded-lg bg-surface-hover p-3">
                    <p className="text-xs text-text-muted">{t("product.ttft")}</p>
                    <p className="text-lg font-semibold text-text-primary">{r.ttft_seconds != null ? `${r.ttft_seconds.toFixed(1)}s` : "—"}</p>
                  </div>
                  <div className="rounded-lg bg-surface-hover p-3">
                    <p className="text-xs text-text-muted">{t("product.e2e")}</p>
                    <p className="text-lg font-semibold text-text-primary">{r.e2e_seconds != null ? `${r.e2e_seconds.toFixed(1)}s` : "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="rounded-xl border border-surface-border bg-surface-card p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-text-muted" /> {t("product.priceTitle")}
                </h2>
                {r.cn_display && (
                  <div className="mb-3">
                    <p className="text-xs text-text-muted mb-2">{t("product.cnPriceLabel")}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-text-muted">{t("product.input")}</span><span className="text-text-primary">¥{r.cn_input}/M</span></div>
                      <div className="flex justify-between"><span className="text-text-muted">{t("product.output")}</span><span className="text-text-primary">¥{r.cn_output}/M</span></div>
                    </div>
                  </div>
                )}
                {r.cn_display && <div className="border-t border-surface-border mb-3" />}
                <div className="mb-3">
                  <p className="text-xs text-text-muted mb-2">Artificial Analysis</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-text-muted">{t("product.inputAa")}</span><span className="text-text-primary">${r.input}/M</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">{t("product.outputAa")}</span><span className="text-text-primary">${r.output}/M</span></div>
                  </div>
                </div>
                {r.openrouter_pricing != null && (
                  <>
                    <div className="border-t border-surface-border mb-3" />
                    <div className="mb-3">
                      <p className="text-xs text-text-muted mb-2">{t("product.orPricing")}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-text-muted">{t("product.input")}</span><span className="text-text-primary">${r.openrouter_pricing.prompt}/M</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">{t("product.output")}</span><span className="text-text-primary">${r.openrouter_pricing.completion}/M</span></div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {r.openrouter_weekly_tokens != null && (
                <div className="rounded-xl border border-surface-border bg-surface-card p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent-emerald" /> {t("product.orTokens")}
                  </h2>
                  <p className="text-2xl font-bold text-text-primary">
                    {r.openrouter_weekly_tokens >= 1e12
                      ? <>{((r.openrouter_weekly_tokens / 1e12).toFixed(2))}<span className="text-sm text-text-muted ml-1">T</span></>
                      : <>{((r.openrouter_weekly_tokens / 1e9).toFixed(1))}<span className="text-sm text-text-muted ml-1">B</span></>
                    }
                    <span className="text-sm text-text-muted ml-1">Tokens/周</span>
                  </p>
                  <a
                    href="https://openrouter.ai/rankings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-text-muted hover:text-accent-violet transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" /> {t("product.orSource")}
                  </a>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
