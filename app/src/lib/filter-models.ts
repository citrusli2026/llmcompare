/**
 * /models 页的文本搜索 + 公司筛选纯函数。
 * 从组件抽离以便单测；不依赖 React / Next.js。
 */

export interface FilterableModel {
  id: string;
  name: string;
  company: string;
  type: string;
}

export interface ModelFilterCriteria {
  /** 模型类型（开源/闭源），undefined 表示不按类型筛选 */
  type?: string;
  /** 文本搜索词，匹配 name/company/id，大小写不敏感 */
  query?: string;
  /** 公司名精确匹配，空串/undefined 表示全部公司 */
  company?: string;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** 搜索词匹配 name / company / id，大小写不敏感；空词匹配全部 */
export function matchesQuery(model: FilterableModel, query: string): boolean {
  const q = normalizeQuery(query);
  if (!q) return true;
  return (
    model.name.toLowerCase().includes(q) ||
    model.company.toLowerCase().includes(q) ||
    model.id.toLowerCase().includes(q)
  );
}

export function filterModels<T extends FilterableModel>(
  models: T[],
  criteria: ModelFilterCriteria
): T[] {
  return models.filter((m) => {
    if (criteria.type !== undefined && m.type !== criteria.type) return false;
    if (criteria.company && m.company !== criteria.company) return false;
    return matchesQuery(m, criteria.query ?? "");
  });
}

export interface CompanyOption {
  name: string;
  count: number;
}

/** 公司下拉选项：按模型数降序，数量相同按名称字母序 */
export function listCompanies(models: FilterableModel[]): CompanyOption[] {
  const counts = new Map<string, number>();
  for (const m of models) {
    counts.set(m.company, (counts.get(m.company) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** 是否存在非默认筛选状态（搜索词 / 公司 / 非默认类型） */
export function hasActiveFilters(
  criteria: ModelFilterCriteria,
  defaultType?: string
): boolean {
  return (
    normalizeQuery(criteria.query ?? "") !== "" ||
    !!criteria.company ||
    (criteria.type !== undefined && criteria.type !== defaultType)
  );
}
