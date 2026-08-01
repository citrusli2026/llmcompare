import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCompareIds } from "@/hooks/use-compare-ids";

// 可控的 next/navigation mock：每个用例可重写 URL 参数，router.replace 用 spy 断言
const { mockReplace, paramsBox } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  paramsBox: { params: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => paramsBox.params,
  usePathname: () => "/models",
}));

// ranking.json 中确定存在的模型 id（selectedModels 走真实数据查询）
const REAL_ID = "claude-opus-5";

function setParams(raw: string) {
  paramsBox.params = new URLSearchParams(raw);
}

/** replace 最近一次调用的第一个参数（query string） */
function lastReplaceQuery(): string {
  const calls = mockReplace.mock.calls;
  return String(calls[calls.length - 1][0]);
}

describe("useCompareIds", () => {
  beforeEach(() => {
    localStorage.clear();
    mockReplace.mockClear();
    setParams("");
  });

  it("无 ?compare 参数时初始为空", () => {
    const { result } = renderHook(() => useCompareIds());
    expect(result.current.compareIds).toEqual([]);
    expect(result.current.selectedModels).toEqual([]);
    expect(result.current.isAtMax).toBe(false);
  });

  it("解析 ?compare=a,b 为 id 列表", () => {
    setParams("compare=a,b");
    const { result } = renderHook(() => useCompareIds());
    expect(result.current.compareIds).toEqual(["a", "b"]);
    expect(result.current.isInCompare("a")).toBe(true);
    expect(result.current.isInCompare("c")).toBe(false);
  });

  it("selectedModels 过滤掉不存在的 id", () => {
    setParams(`compare=${REAL_ID},no-such-model`);
    const { result } = renderHook(() => useCompareIds());
    expect(result.current.selectedModels.map((m) => m.id)).toEqual([REAL_ID]);
  });

  it("toggleCompare 添加 id：更新 URL 并镜像 localStorage", () => {
    const { result } = renderHook(() => useCompareIds());

    act(() => {
      result.current.toggleCompare("a");
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(lastReplaceQuery()).toBe("?compare=a");
    expect(localStorage.getItem("llmcompare-compare")).toBe("a");
  });

  it("toggleCompare 再次点击同一 id 为移除", () => {
    setParams("compare=a,b");
    const { result } = renderHook(() => useCompareIds());

    act(() => {
      result.current.toggleCompare("a");
    });

    expect(lastReplaceQuery()).toBe("?compare=b");
    expect(localStorage.getItem("llmcompare-compare")).toBe("b");
  });

  it("保留 URL 中已有的其他参数", () => {
    setParams("q=gpt&compare=a");
    const { result } = renderHook(() => useCompareIds());

    act(() => {
      result.current.toggleCompare("b");
    });

    expect(lastReplaceQuery()).toBe("?q=gpt&compare=a%2Cb");
  });

  it("桌面端最多 3 个：达到上限后 toggle 新 id 不生效", () => {
    setParams("compare=a,b,c");
    const { result } = renderHook(() => useCompareIds());
    expect(result.current.isAtMax).toBe(true);

    act(() => {
      result.current.toggleCompare("d");
    });

    expect(mockReplace).not.toHaveBeenCalled();
    // 已在列表中的 id 仍可移除
    act(() => {
      result.current.toggleCompare("a");
    });
    expect(lastReplaceQuery()).toBe("?compare=b%2Cc");
  });

  it("removeCompare 移除指定 id", () => {
    setParams("compare=a,b");
    const { result } = renderHook(() => useCompareIds());

    act(() => {
      result.current.removeCompare("b");
    });

    expect(lastReplaceQuery()).toBe("?compare=a");
  });

  it("clearCompare 清空：URL 删除参数并清除 localStorage", () => {
    setParams("compare=a,b");
    localStorage.setItem("llmcompare-compare", "a,b");
    const { result } = renderHook(() => useCompareIds());

    act(() => {
      result.current.clearCompare();
    });

    expect(lastReplaceQuery()).toBe("?");
    expect(localStorage.getItem("llmcompare-compare")).toBeNull();
  });
});
