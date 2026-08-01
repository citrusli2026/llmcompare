/**
 * 首页场景卡推荐逻辑（纯函数，可单测）。
 * scene-selector.tsx 只负责渲染，排序/去重/性价比计算都在这里。
 */

export type SceneKey = "hotness" | "intelligence" | "coding" | "agentic" | "value";

/** 通用排序：按 score 访问器降序，score 为 null 的模型排除 */
export function rankByScore<T>(items: T[], score: (item: T) => number | null): T[] {
  return items
    .filter((item) => score(item) != null)
    .sort((a, b) => score(b)! - score(a)!);
}

/** 反聚簇：排序后逐个加入，同 company 出现 ≥ 1 次时跳过，留给后面 */
export function pickTopN<T extends { company: string }>(items: T[], n: number): T[] {
  const out: T[] = [];
  const seenCo = new Set<string>();
  for (const m of items) {
    if (out.length >= n) break;
    if (seenCo.has(m.company)) continue;
    out.push(m);
    seenCo.add(m.company);
  }
  return out;
}

/**
 * 性价比 = 智能分 / blended 美元价。
 * 无价格（null）或免费（0）的模型返回 null 排除 —— 避免除零，
 * 与 utils.ts isValuePick 对 blended <= 0 的处理一致。
 * 计算统一用美元 blended，不换算 cn_pricing。
 */
export function valueScore(m: {
  raw: { intelligence: number | null; blended: number | null };
}): number | null {
  const { intelligence, blended } = m.raw;
  if (intelligence == null || blended == null || blended <= 0) return null;
  return intelligence / blended;
}
