import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductDetailClient } from "@/components/product-detail";
import { type ModelWithScores } from "@/lib/scoring";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const makeModel = (
  overrides: Partial<ModelWithScores["raw"]> & {
    flags?: Partial<ModelWithScores["flags"]>;
    type?: "开源" | "闭源";
    vendor_links?: ModelWithScores["vendor_links"];
  } = {}
): ModelWithScores => {
  const { flags: flagOverrides, type, vendor_links, ...rawOverrides } = overrides;
  return {
    id: "test-model",
    name: "Test Model",
    company: "TestCo",
    type: type ?? "开源",
    logo: "",
    url: "https://example.com",
    vendor_links,
    flags: {
      frontier: false,
      open_weights: true,
      reasoning: false,
      image_input: false,
      chinese_eval: true,
      has_speed: false,
      data_complete: true,
      ...flagOverrides,
    },
    raw: {
      intelligence: 75.5,
      coding: 70.2,
      agentic: 65.0,
      median_tps: 45.5,
      ttft_seconds: 0.8,
      e2e_seconds: 12.3,
      p05_tps: 35.0,
      p95_tps: 55.0,
      input: 1.5,
      output: 2.5,
      blended: 2.0,
      display: "$1.5/$2.5",
      cn_input: 10.5,
      cn_output: 15.0,
      cn_display: "¥10.5/¥15.0",
      isInternational: false,
      context_window: 128000,
      parameters: 70,
      output_tokens: 4096,
      release_date: "2024-06-15",
      omniscience: 82.1,
      arena_votes: 1234567,
      openrouter_weekly_tokens: 5000000000,
      openrouter_pricing: { prompt: 1.5, completion: 2.5 },
      arena_rankings: { code: { rank: 5, score: 1250, votes: 1000 } },
      arena_code: 1250,
      data_completeness_pct: 85,
      benchmarks: {
        gpqa: 78.5,
        hle: 62.3,
        mmlu_pro: 70.1,
      },
      ...rawOverrides,
    },
  };
};

describe("ProductDetail Integration — 数据→渲染全链路", () => {
  it("完整模型数据正确渲染所有字段", () => {
    const model = makeModel();
    render(<ProductDetailClient model={model} />);

    // 基本信息
    expect(screen.getByText("Test Model")).toBeInTheDocument();
    expect(screen.getByText("TestCo")).toBeInTheDocument();
    expect(screen.getByText("common.open")).toBeInTheDocument();

    // Quick Facts
    expect(screen.getByText("70B")).toBeInTheDocument(); // parameters
    expect(screen.getByText("128K")).toBeInTheDocument(); // context_window 数字格式化
    expect(screen.getByText("4K")).toBeInTheDocument(); // output_tokens
    expect(screen.getByText("2024-06-15")).toBeInTheDocument();

    // Benchmarks
    expect(screen.getAllByText("75.5").length).toBeGreaterThanOrEqual(1); // intelligence
    expect(screen.getAllByText("70.2").length).toBeGreaterThanOrEqual(1); // coding
    expect(screen.getAllByText("65.0").length).toBeGreaterThanOrEqual(1); // agentic
    expect(screen.getByText("82.1")).toBeInTheDocument(); // omniscience
  });

  it("context_window 为字符串 '922k' 时直接显示，不格式化", () => {
    const model = makeModel({ context_window: "922k" as unknown as number });
    render(<ProductDetailClient model={model} />);

    // 应显示原始字符串 "922k"，而不是 NaNK
    expect(screen.getByText("922k")).toBeInTheDocument();
    expect(screen.queryByText("NaNK")).not.toBeInTheDocument();
  });

  it("context_window 为 null 时显示 em dash", () => {
    const model = makeModel({ context_window: null });
    render(<ProductDetailClient model={model} />);

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("闭源模型显示闭源 badge", () => {
    const model = makeModel({ type: "闭源" });
    render(<ProductDetailClient model={model} />);

    expect(screen.getByText("common.closed")).toBeInTheDocument();
  });

  it("flags 条件渲染：frontier=true 显示 frontier badge", () => {
    const model = makeModel({ flags: { frontier: true } });
    render(<ProductDetailClient model={model} />);

    expect(screen.getByText("common.frontier")).toBeInTheDocument();
  });

  it("flags 条件渲染：reasoning=true 显示 reasoning badge", () => {
    const model = makeModel({ flags: { reasoning: true } });
    render(<ProductDetailClient model={model} />);

    expect(screen.getByText("common.reasoning")).toBeInTheDocument();
  });

  it("vendor_links 渲染外部链接", () => {
    const model = makeModel({
      vendor_links: {
        homepage: "https://test.com",
        api_docs: "https://test.com/api",
        github: "https://github.com/test",
      },
    });
    render(<ProductDetailClient model={model} />);

    expect(screen.getByText("product.homepage")).toBeInTheDocument();
    expect(screen.getByText("product.apiDocs")).toBeInTheDocument();
    expect(screen.getByText("product.github")).toBeInTheDocument();
  });

  it("无 vendor_links 时不渲染链接区域", () => {
    const model = makeModel({ vendor_links: {} });
    render(<ProductDetailClient model={model} />);

    expect(screen.queryByText("product.homepage")).not.toBeInTheDocument();
  });

  it("arena_rankings 数据正确渲染", () => {
    const model = makeModel({
      arena_rankings: {
        code: { rank: 3, score: 1300, votes: 5000 },
        overall: { rank: 5, score: 1250 },
      },
    });
    render(<ProductDetailClient model={model} />);

    expect(screen.getAllByText("1250").length).toBeGreaterThanOrEqual(1);
  });
});
