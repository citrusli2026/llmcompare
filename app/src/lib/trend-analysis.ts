// ── 趋势序列分析（trend-section.tsx 消费，纯函数便于单测）──

export interface ChangePoint {
  /** 在原始数组（含 null 占位）中的下标，对齐全局日期轴 */
  i: number;
  /** 变化后的值 */
  v: number;
  /** 上一个非 null 值 */
  prev: number;
}

/**
 * 找出序列中所有“值发生变化”的点。
 * 跳过 null（数据缺失），与上一个非 null 值比较；首个非 null 点不算变化。
 * 平坦序列返回空数组。
 */
export function findChangePoints(values: (number | null)[]): ChangePoint[] {
  const points: ChangePoint[] = [];
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (v == null) return;
    if (prev != null && v !== prev) points.push({ i, v, prev });
    prev = v;
  });
  return points;
}
