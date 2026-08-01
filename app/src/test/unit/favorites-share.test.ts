import { describe, it, expect } from "vitest";
import { encodeIds, decodeIds, filterValidIds } from "@/lib/favorites-share";

describe("encodeIds", () => {
  it("空列表 → 空串", () => {
    expect(encodeIds([])).toBe("");
  });

  it("逗号连接", () => {
    expect(encodeIds(["gpt-5", "claude-4"])).toBe("gpt-5,claude-4");
  });

  it("去重且保持原顺序", () => {
    expect(encodeIds(["a", "b", "a", "c", "b"])).toBe("a,b,c");
  });
});

describe("decodeIds", () => {
  it("null → []", () => {
    expect(decodeIds(null)).toEqual([]);
  });

  it("空串 → []", () => {
    expect(decodeIds("")).toEqual([]);
  });

  it("拆分逗号", () => {
    expect(decodeIds("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("去空白、去空项", () => {
    expect(decodeIds(" a ,, b ,")).toEqual(["a", "b"]);
  });

  it("去重且保持原顺序", () => {
    expect(decodeIds("b,a,b,c,a")).toEqual(["b", "a", "c"]);
  });

  it("encode/decode 互逆", () => {
    const ids = ["gpt-5", "kimi-k2", "deepseek-v4"];
    expect(decodeIds(encodeIds(ids))).toEqual(ids);
  });
});

describe("filterValidIds", () => {
  const valid = new Set(["a", "b", "c"]);

  it("过滤无效 id，保持原顺序", () => {
    expect(filterValidIds(["b", "x", "a", "y"], valid)).toEqual(["b", "a"]);
  });

  it("全部无效 → []", () => {
    expect(filterValidIds(["x", "y"], valid)).toEqual([]);
  });

  it("空输入 → []", () => {
    expect(filterValidIds([], valid)).toEqual([]);
  });
});
