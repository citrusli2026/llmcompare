import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider, useTranslation } from "@/lib/i18n";

// Mock next/navigation for usePathname in navbar
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// 测试组件：消费 i18n 并展示切换按钮
function TestComponent() {
  const { locale, setLocale, t } = useTranslation();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="text">{t("nav.brand")}</span>
      <button onClick={() => setLocale(locale === "zh" ? "en" : "zh")}>
        Switch
      </button>
    </div>
  );
}

describe("I18n Integration — 语言切换全局生效", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("默认语言为 zh", () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId("locale").textContent).toBe("zh");
    expect(screen.getByTestId("text").textContent).toBe("模型图鉴");
  });

  it("切换语言为 en", () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    fireEvent.click(screen.getByText("Switch"));

    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("text").textContent).toBe("LLMCompare");
  });

  it("切换语言持久化到 localStorage", () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    fireEvent.click(screen.getByText("Switch"));

    expect(localStorage.getItem("llmcompare-locale")).toBe("en");
  });

  it("从 localStorage 恢复语言偏好", () => {
    localStorage.setItem("llmcompare-locale", "en");

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("text").textContent).toBe("LLMCompare");
  });

  it("缺失翻译 key 回退显示 key 本身", () => {
    function MissingKeyComponent() {
      const { t } = useTranslation();
      return <span>{t("nonexistent.key.here")}</span>;
    }

    render(
      <I18nProvider>
        <MissingKeyComponent />
      </I18nProvider>
    );

    expect(screen.getByText("nonexistent.key.here")).toBeInTheDocument();
  });

  it("模板参数替换正确", () => {
    function ParamsComponent() {
      const { t } = useTranslation();
      // 假设 zh.json 中有 "hello": "Hello {name}"
      return <span>{t("models.count", { count: "42" })}</span>;
    }

    render(
      <I18nProvider>
        <ParamsComponent />
      </I18nProvider>
    );

    // zh.json 中 models.count 应该是 "共 {count} 个模型"
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});
