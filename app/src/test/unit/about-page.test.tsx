import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AboutPageClient from "@/app/about/about-page-client";

// Mock i18n：英文模式，回显 key
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    locale: "en",
    setLocale: vi.fn(),
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/about",
  useSearchParams: () => new URLSearchParams(),
}));

describe("About 页英文模式", () => {
  it("changelog detail 不泄漏管线预烘焙中文", () => {
    render(<AboutPageClient />);
    // changes.json 中 new 类型的预烘焙 detail 含“智商”，应按当前语言重新格式化
    expect(screen.queryByText(/智商/)).toBeNull();
  });

  it("数据更新时间按当前语言格式化", () => {
    render(<AboutPageClient />);
    const el = screen.getByText(/about\.lastUpdated/);
    // en-US 为 月/日/年；zh-CN 的年份在最前，不会匹配此模式
    expect(el.textContent).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("贡献引导句的标点不硬编码中文句号", () => {
    render(<AboutPageClient />);
    const link = screen.getByRole("link", { name: "GitHub Issues" });
    expect(link.parentElement!.textContent).not.toContain("。");
  });
});
