import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ComparePageClient } from "@/app/compare/compare-client";
import { getAllModels } from "@/lib/scoring";

// 数据每天刷新，写死模型 id 会在数据变更后失效 —— 由测试运行时从当前 ranking.json 取。
const nav = vi.hoisted(() => ({ models: "" }));

// Mock i18n：回显 key，断言不依赖具体文案
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(`models=${nav.models}`),
  usePathname: () => "/compare",
}));

describe("对比页添加上限提示", () => {
  it("达到上限时添加按钮禁用,悬停显示原因 tooltip", async () => {
    // 桌面上限 3 个（useMaxCompare: jsdom 宽度 1024 → MAX_COMPARE_DESKTOP）
    nav.models = getAllModels().slice(0, 3).map((m) => m.id).join(",");

    render(<ComparePageClient />);
    // 客户端组件首次渲染后再补数据，CI 机器慢时同步 getByRole 会偶发找不到
    const addBtn = await screen.findByRole("button", { name: /compare\.addModel/ });
    expect(addBtn).toBeDisabled();
    // disabled 按钮自身不触发 hover,tooltip 必须挂在外层包裹元素上
    fireEvent.mouseOver(addBtn);
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveTextContent("compare.maxReached")
    );
  });
});
