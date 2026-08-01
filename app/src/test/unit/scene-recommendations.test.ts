import { describe, it, expect } from "vitest";
import { rankByScore, pickTopN } from "@/lib/scene-recommendations";
import { getAllModels } from "@/lib/scoring";

describe("rankByScore", () => {
  it("按 score 降序", () => {
    const items = [{ v: 1 }, { v: 3 }, { v: 2 }];
    expect(rankByScore(items, (x) => x.v).map((x) => x.v)).toEqual([3, 2, 1]);
  });

  it("score 为 null 的项被排除", () => {
    const items: { v: number | null }[] = [{ v: 1 }, { v: null }, { v: 2 }];
    expect(rankByScore(items, (x) => x.v).map((x) => x.v)).toEqual([2, 1]);
  });

  it("全部 null → []", () => {
    const items: { v: number | null }[] = [{ v: null }];
    expect(rankByScore(items, (x) => x.v)).toEqual([]);
  });
});

describe("pickTopN", () => {
  const items = [
    { id: "a1", company: "A" },
    { id: "a2", company: "A" },
    { id: "b1", company: "B" },
    { id: "c1", company: "C" },
    { id: "b2", company: "B" },
    { id: "d1", company: "D" },
  ];

  it("同公司去重，取满 n 个", () => {
    expect(pickTopN(items, 4).map((x) => x.id)).toEqual(["a1", "b1", "c1", "d1"]);
  });

  it("候选不足 n 个时全部返回", () => {
    expect(pickTopN(items.slice(0, 2), 4).map((x) => x.id)).toEqual(["a1"]);
  });

  it("n=0 → []", () => {
    expect(pickTopN(items, 0)).toEqual([]);
  });
});

describe("真实数据冒烟（ranking.json）", () => {
  it("编程 / Agent 场景按分数降序且同公司不重复", () => {
    const models = getAllModels();
    for (const score of [(m: (typeof models)[0]) => m.raw.coding, (m: (typeof models)[0]) => m.raw.agentic] as const) {
      const top = pickTopN(rankByScore(models, score), 4);
      expect(top.length).toBeGreaterThanOrEqual(3);
      expect(new Set(top.map((m) => m.company)).size).toBe(top.length);
      const scores = top.map((m) => score(m)!);
      expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    }
  });
});
