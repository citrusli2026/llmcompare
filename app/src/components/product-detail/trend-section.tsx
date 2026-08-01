"use client";

import { useMemo } from "react";
import { Activity, Minus, TrendingDown, TrendingUp } from "lucide-react";
import trendsJson from "@/data/trends.json";
import { findChangePoints } from "@/lib/trend-analysis";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ── trends.json 结构（data/3-process/build_trends.py 产出，全站静态单例）──
interface ModelTrend {
  id: string;
  name: string;
  company: string;
  intelligence: (number | null)[];
  blended: (number | null)[];
  tokens: (number | null)[];
  rank: (number | null)[];
}

const trendsById = new Map<string, ModelTrend>(
  (trendsJson.models as ModelTrend[]).map((m) => [m.id, m])
);

// 全局日期轴（ISO 日期），变化点 tooltip 用它标注时间
const TREND_DATES = trendsJson.dates as string[];

type TrendKey = "intelligence" | "blended" | "rank";

interface TrendPoint {
  i: number;
  v: number;
}

/** 跳过缺失（null）日期，保留其在全局日期轴上的位置 */
function toPoints(values: (number | null)[]): TrendPoint[] {
  const pts: TrendPoint[] = [];
  values.forEach((v, i) => {
    if (v != null) pts.push({ i, v });
  });
  return pts;
}

// ── Sparkline：纯 SVG 折线 + 端点 + 变化点，viewBox 拉伸、描边不缩放 ──
const VIEW_W = 100;
const VIEW_H = 40;
const PAD = 3;

interface SparkMarker {
  i: number;
  v: number;
  title: string;
}

function Sparkline({
  values,
  markers = [],
  flat = false,
  className,
}: {
  values: (number | null)[];
  /** 值发生变化的点（含 tooltip 文案） */
  markers?: SparkMarker[];
  /** 全程无变化：虚线弱化，如实表达“稳定”而非伪装成趋势 */
  flat?: boolean;
  className?: string;
}) {
  const pts = toPoints(values);
  const n = values.length;
  const vs = pts.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const x = (i: number) => PAD + (n <= 1 ? 0 : (i / (n - 1)) * (VIEW_W - 2 * PAD));
  const y = (v: number) =>
    max === min ? VIEW_H / 2 : PAD + (1 - (v - min) / (max - min)) * (VIEW_H - 2 * PAD);

  const d = pts
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${x(p.i).toFixed(2)} ${y(p.v).toFixed(2)}`)
    .join(" ");
  const first = pts[0];
  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      className={cn("h-20 w-full", className)}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={flat ? "3 3" : undefined}
        opacity={flat ? 0.5 : 1}
      />
      <circle cx={x(first.i)} cy={y(first.v)} r={1.6} fill="currentColor" opacity={0.45} />
      <circle cx={x(last.i)} cy={y(last.v)} r={2.2} fill="currentColor" />
      {markers.map((m) => (
        <circle key={m.i} cx={x(m.i)} cy={y(m.v)} r={2.2} fill="currentColor">
          <title>{m.title}</title>
        </circle>
      ))}
    </svg>
  );
}

// ── 单条序列卡片：标签 + sparkline + 起止值与变化箭头 ──
interface SeriesDef {
  key: TrendKey;
  labelKey: string;
  higherIsBetter: boolean;
  lineClass: string;
  format: (v: number) => string;
  formatDelta: (v: number) => string;
}

const SERIES_DEFS: SeriesDef[] = [
  {
    key: "intelligence",
    labelKey: "product.trendIntelligence",
    higherIsBetter: true,
    lineClass: "text-accent-violet",
    format: (v) => (v % 1 === 0 ? String(v) : v.toFixed(1)),
    formatDelta: (v) => (v % 1 === 0 ? String(v) : v.toFixed(1)),
  },
  {
    key: "blended",
    labelKey: "product.trendBlended",
    higherIsBetter: false,
    lineClass: "text-accent-cyan",
    format: (v) => `$${v.toFixed(2)}`,
    formatDelta: (v) => `$${v.toFixed(2)}`,
  },
  {
    key: "rank",
    labelKey: "product.trendRank",
    higherIsBetter: false,
    lineClass: "text-accent-fuchsia",
    format: (v) => `#${Math.round(v)}`,
    formatDelta: (v) => String(Math.round(v)),
  },
];

function TrendSeries({ def, values }: { def: SeriesDef; values: (number | null)[] }) {
  const { t } = useTranslation();
  const pts = toPoints(values);
  const first = pts[0].v;
  const last = pts[pts.length - 1].v;
  const delta = last - first;
  const flat = Math.abs(delta) < 1e-9;
  const improved = def.higherIsBetter ? delta > 0 : delta < 0;

  const Icon = flat ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaClass = flat
    ? "text-text-muted"
    : improved
      ? "text-accent-lime"
      : "text-accent-coral";

  // 变化点标记：ISO 日期 + 前后值，原生 tooltip 双语通用
  const markers: SparkMarker[] = findChangePoints(values).map((p) => ({
    i: p.i,
    v: p.v,
    title: `${TREND_DATES[p.i] ?? ""}: ${def.format(p.prev)} → ${def.format(p.v)}`,
  }));

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs text-text-secondary truncate">{t(def.labelKey)}</span>
        <span className={cn("inline-flex items-center gap-1 text-xs font-medium tabular-nums", deltaClass)}>
          <Icon className="h-3.5 w-3.5" />
          {flat ? "—" : `${delta > 0 ? "+" : "-"}${def.formatDelta(Math.abs(delta))}`}
        </span>
      </div>
      <Sparkline values={values} markers={markers} flat={flat} className={def.lineClass} />
      <div className="mt-1 flex items-center justify-between text-xs tabular-nums">
        <span className="text-text-muted">{def.format(first)}</span>
        <span className="font-semibold text-text-primary">{def.format(last)}</span>
      </div>
    </div>
  );
}

interface TrendSectionProps {
  model: ModelWithScores;
}

export function TrendSection({ model }: TrendSectionProps) {
  const { t } = useTranslation();
  const trend = trendsById.get(model.id);

  // 数据缺失（有效点 < 2）的序列整条跳过
  const visibleSeries = useMemo(() => {
    if (!trend) return [];
    return SERIES_DEFS.filter((def) => toPoints(trend[def.key]).length >= 2);
  }, [trend]);

  // 模型无 trends 数据时整个区块不渲染
  if (!trend || visibleSeries.length === 0) return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-text-muted" />
        {t("product.trendTitle")}
      </h3>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleSeries.map((def) => (
          <TrendSeries key={def.key} def={def} values={trend[def.key]} />
        ))}
      </div>
    </div>
  );
}
