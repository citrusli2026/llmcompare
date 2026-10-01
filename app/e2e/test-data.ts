/**
 * E2E 模型选取器 —— 不要在 spec 里硬编码模型 id。
 *
 * 每日数据刷新按「发布时间 ≤180 天」窗口轮换榜单模型（2026-10-01 的刷新就把
 * gemini-3-1-pro-preview / claude-sonnet-4-6 换掉了），硬编码 id 会让 CI 在每次
 * 数据刷新后变红。所有需要具体模型的测试都从这里按条件取。
 */
import fs from "node:fs";
import path from "node:path";

export interface RankingModel {
  id: string;
  name: string;
  company: string;
  scores?: Record<string, number | null>;
  pricing?: { input?: number | null; output?: number | null; display?: string | null };
  speed?: { median_tps?: number | null };
  benchmarks?: Record<string, number | null>;
  meta?: { context_window?: number | null };
  vendor_links?: { homepage?: string | null; console?: string | null };
  arena_rankings?: Record<string, { rank?: number; score?: number; votes?: number }> | null;
  cn_pricing?: unknown;
}

/** 定位榜单数据：兼容 `cd app && npx playwright test` 与仓库根目录调用 */
function resolveRankingPath(): string {
  const candidates = [
    path.join(process.cwd(), "src", "data", "ranking.json"),
    path.join(process.cwd(), "app", "src", "data", "ranking.json"),
  ];
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) throw new Error(`[e2e] 找不到 ranking.json，已尝试: ${candidates.join(", ")}`);
  return hit;
}

/** 前端真实消费的榜单数据（构建产物同一份） */
export const models: RankingModel[] = JSON.parse(fs.readFileSync(resolveRankingPath(), "utf8"));

/** 按条件取第一个命中模型；取不到直接抛错，避免"静默 404"式失败 */
export function pick(predicate: (m: RankingModel) => boolean, label: string): RankingModel {
  const hit = models.find(predicate);
  if (!hit) {
    throw new Error(
      `[e2e] ranking.json 中找不到满足「${label}」的模型；` +
        `数据刷新后请更新 e2e/test-data.ts 里的选取条件`
    );
  }
  return hit;
}

/** 榜单第一（智能分最高） */
export const topModel = () => pick(() => true, "任意模型");

/**
 * 详情页数据齐全的模型：分数 + 美元价 + 速度 + 上下文 + GPQA + 官网外链，
 * 且没有国内官价（保证 AA 美元价区块一定渲染）。
 */
export const modelWithFullDetail = () =>
  pick(
    (m) =>
      m.scores?.coding != null &&
      m.pricing?.input != null &&
      m.speed?.median_tps != null &&
      m.meta?.context_window != null &&
      m.benchmarks?.gpqa != null &&
      !!m.vendor_links?.homepage &&
      !m.cn_pricing,
    "详情页数据齐全（分数/价格/速度/上下文/GPQA/官网）"
  );

export const modelWithArena = () =>
  pick((m) => Object.keys(m.arena_rankings ?? {}).length > 0, "有 Arena 排名/投票");

export const modelWithoutArena = () =>
  pick((m) => Object.keys(m.arena_rankings ?? {}).length === 0, "无 Arena 排名/投票");

/** 对比页用：取 n 个不同厂商的头部模型，避免变体聚合干扰 */
export function compareModelIds(n = 2): string[] {
  const out: RankingModel[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.company)) continue;
    seen.add(m.company);
    out.push(m);
    if (out.length === n) break;
  }
  return out.map((m) => m.id);
}

/** 与 quick-facts.tsx 的上下文窗口渲染保持一致（spec 里不 import app 源码） */
export function contextWindowText(ctx: number | string | null | undefined): string {
  if (ctx == null) return "";
  return typeof ctx === "number" ? `${(ctx / 1000).toFixed(0)}K` : String(ctx);
}
