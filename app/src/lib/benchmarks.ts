/**
 * 单项 benchmark 的展示元数据与格式化。
 * 单一来源：详情页 benchmark-section 与 compare 页行都从这里取。
 * 字段清单与 data/3-process/build_frontend_models.py 的 BENCHMARK_FIELDS 保持一致
 * （顺序 = 覆盖率/重要性降序，gpqa/hle 置顶沿用旧版展示）。
 */

import type { ModelWithScores } from "@/lib/scoring";

export type BenchmarkKey = keyof ModelWithScores["raw"]["benchmarks"];

export interface BenchmarkDef {
  key: BenchmarkKey;
  /** i18n label key（benchmark.* 命名空间） */
  labelKey: string;
  /** i18n tooltip key，可选 */
  tipKey?: string;
}

export const BENCHMARK_DEFS: BenchmarkDef[] = [
  { key: "gpqa", labelKey: "benchmark.gpqa", tipKey: "tip.gpqa" },
  { key: "hle", labelKey: "benchmark.hle", tipKey: "tip.hle" },
  { key: "scicode", labelKey: "benchmark.scicode" },
  { key: "lcr", labelKey: "benchmark.lcr" },
  { key: "critpt", labelKey: "benchmark.critpt" },
  { key: "ifbench", labelKey: "benchmark.ifbench" },
  { key: "tau2", labelKey: "benchmark.tau2" },
  { key: "terminalbench_hard", labelKey: "benchmark.terminalbenchHard" },
  { key: "mmmu_pro", labelKey: "benchmark.mmmuPro" },
  { key: "gdpval", labelKey: "benchmark.gdpval" },
  { key: "livecodebench", labelKey: "benchmark.livecodebench" },
  { key: "aime25", labelKey: "benchmark.aime25" },
];

/**
 * 格式化 benchmark 分数：多数 benchmark 为 0-1 小数，显示为百分比；
 * gdpval 等为绝对分值（>1），原样显示一位小数。
 */
export function formatBenchmarkValue(v: number | null | undefined): string {
  if (v == null) return "—";
  return v <= 1 ? `${(v * 100).toFixed(1)}%` : v.toFixed(1);
}
