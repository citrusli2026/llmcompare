import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ComparePageClient } from "@/app/compare/compare-client";

// Mock i18n：回显 key，断言不依赖具体文案
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// 桌面上限 3 个（useMaxCompare: jsdom 宽度 1024 → MAX_COMPARE_DESKTOP）
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams("models=kimi-k2-6,gpt-5-5,claude-opus-4-8"),
  usePathname: () => "/compare",
}));

describe("对比页添加上限提示", () => {
  it("达到上限时添加按钮禁用,悬停显示原因 tooltip", () => {
    render(<ComparePageClient />);
    const addBtn = screen.getByRole("button", { name: /compare\.addModel/ });
    expect(addBtn).toBeDisabled();
    // disabled 按钮自身不触发 hover,tooltip 必须挂在外层包裹元素上
    fireEvent.mouseOver(addBtn);
    expect(screen.getByRole("tooltip")).toHaveTextContent("compare.maxReached");
  });
});
