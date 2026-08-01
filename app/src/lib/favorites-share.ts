/**
 * 收藏列表的 URL 序列化 — /favorites?ids=a,b,c
 * 与 use-favorites(localStorage) 解耦：只负责字符串 ⇄ id 数组的转换与有效性过滤。
 */

/** id 列表 → URL 参数值（去重，保持原顺序） */
export function encodeIds(ids: string[]): string {
  return [...new Set(ids)].join(",");
}

/** URL 参数值 → id 列表（去空白、去空项、去重，保持原顺序）；null/空串 → [] */
export function decodeIds(raw: string | null): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** 静默过滤掉不在 validIds 中的 id（如已下架模型），保持原顺序 */
export function filterValidIds(ids: string[], validIds: ReadonlySet<string>): string[] {
  return ids.filter((id) => validIds.has(id));
}
