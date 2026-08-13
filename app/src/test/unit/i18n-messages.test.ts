import { describe, it, expect } from "vitest";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";

/** Deep-compare two message objects — recurse into nested objects */
function traverseKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    typeof v === "object" && v !== null && !Array.isArray(v)
      ? traverseKeys(v, prefix ? `${prefix}.${k}` : k)
      : [prefix ? `${prefix}.${k}` : k]
  );
}

/** Check if a message value has template params like {count} */
function getParams(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

describe("i18n message data integrity — 无渲染测试", () => {
  it("所有 zh 翻译 key 在 en 中都有对应 (100%)", () => {
    const zhKeys = new Set(traverseKeys(zh));
    const enKeys = new Set(traverseKeys(en));

    const missing = [...zhKeys].filter((k) => !enKeys.has(k));
    // 双语文档必须完全对齐: 缺键会回退显示原始 key, 用户看到 "home.badge" 这类裸键
    expect(missing).toEqual([]);
    expect(zhKeys.size).toBeGreaterThan(0);
    expect(enKeys.size).toBe(zhKeys.size);
  });

  it("模板参数在 zh↔en 之间保持一致", () => {
    const zhKeys = traverseKeys(zh);
    const enKeys = traverseKeys(en);
    const enMap = new Map(enKeys.map((k, i) => [k, i]));

    for (const key of zhKeys) {
      const zhVal = String(getNestedValue(zh, key) ?? "");
      const enIdx = enMap.get(key);
      if (enIdx === undefined) continue; // zh-only key
      const enVal = String(getNestedValue(en, key) ?? "");

      const zhParams = getParams(zhVal);
      const enParams = getParams(enVal);
      expect(zhParams).toEqual(enParams);
    }
  });

  it("zh.json keys 数量合理（>= 150 条）", () => {
    const keys = traverseKeys(zh);
    expect(keys.length).toBeGreaterThanOrEqual(150);
  });
});

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part: string) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}
