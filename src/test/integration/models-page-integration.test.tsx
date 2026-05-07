import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ModelsPageClient from "@/app/models/models-page-client";
import { type ModelWithScores } from "@/lib/scoring";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params) {
        return key.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
      }
      return key;
    },
  }),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock next/navigation
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/models",
}));

// Mock scoring.ts getAllModelsUnfiltered
vi.mock("@/lib/scoring", async () => {
  const actual = await vi.importActual<typeof import("@/lib/scoring")>("@/lib/scoring");
  return {
    ...actual,
    getAllModelsUnfiltered: vi.fn(),
  };
});

import { getAllModelsUnfiltered } from "@/lib/scoring";

const makeModel = (
  id: string,
  overrides: Partial<ModelWithScores["raw"]> & {
    flags?: Partial<ModelWithScores["flags"]>;
    type?: "开源" | "闭源";
    company?: string;
  } = {}
): ModelWithScores => {
  const { flags: flagOverrides, type, company, ...rawOverrides } = overrides;
  return {
    id,
    name: id,
    company: company ?? "TestCo",
    type: type ?? "开源",
    logo: "",
    url: "",
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
      intelligence: 50,
      coding: 50,
      agentic: 50,
      median_tps: null,
      ttft_seconds: null,
      e2e_seconds: null,
      input: null,
      output: null,
      display: "",
      cn_input: null,
      cn_output: null,
      cn_display: null,
      isInternational: false,
      context_window: null,
      parameters: null,
      output_tokens: null,
      release_date: "2024-01-01",
      omniscience: null,
      openrouter_weekly_tokens: null,
      openrouter_pricing: null,
      arena_rankings: null,
      arena_code: null,
      ...rawOverrides,
    },
  };
};

describe("ModelsPage Integration — 筛选+搜索+表格联动", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置 mockSearchParams
    mockSearchParams = new URLSearchParams();
  });

  it("初始状态显示全部模型", () => {
    const mockModels: ModelWithScores[] = [
      makeModel("open-model-1", { type: "开源" }),
      makeModel("closed-model-1", { type: "闭源" }),
      makeModel("open-model-2", { type: "开源" }),
    ];
    (getAllModelsUnfiltered as ReturnType<typeof vi.fn>).mockReturnValue(mockModels);

    render(<ModelsPageClient />);

    // 模型计数应显示3个 — 使用 getAllByText 并验证至少有一个包含 "3"
    const countElements = screen.getAllByText(/3/);
    expect(countElements.length).toBeGreaterThanOrEqual(1);
    // 所有模型名应出现
    expect(screen.getAllByText("open-model-1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("closed-model-1").length).toBeGreaterThanOrEqual(1);
  });

  it("点击'开源'筛选只显示开源模型", () => {
    const mockModels: ModelWithScores[] = [
      makeModel("open-1", { type: "开源" }),
      makeModel("closed-1", { type: "闭源" }),
      makeModel("open-2", { type: "开源" }),
    ];
    (getAllModelsUnfiltered as ReturnType<typeof vi.fn>).mockReturnValue(mockModels);

    render(<ModelsPageClient />);

    // 点击"开源"筛选按钮
    const openFilterBtn = screen.getByText("models.filterOpen");
    fireEvent.click(openFilterBtn);

    // 计数应更新为2
    const countElements = screen.getAllByText(/2/);
    expect(countElements.length).toBeGreaterThanOrEqual(1);
    // closed-1 不应再显示
    expect(screen.queryByText("closed-1")).not.toBeInTheDocument();
  });

  it("搜索框输入过滤模型", () => {
    const mockModels: ModelWithScores[] = [
      makeModel("deepseek-v4", { company: "DeepSeek" }),
      makeModel("qwen-max", { company: "Alibaba" }),
      makeModel("deepseek-flash", { company: "DeepSeek" }),
    ];
    (getAllModelsUnfiltered as ReturnType<typeof vi.fn>).mockReturnValue(mockModels);

    render(<ModelsPageClient />);

    // 输入搜索词
    const searchInput = screen.getByPlaceholderText("models.searchPlaceholder");
    fireEvent.change(searchInput, { target: { value: "deepseek" } });

    // 只显示匹配 deepseek 的模型
    expect(screen.getAllByText(/deepseek/).length).toBeGreaterThanOrEqual(2);
    // qwen-max 不应显示
    expect(screen.queryByText("qwen-max")).not.toBeInTheDocument();
  });

  it("筛选+搜索组合：交集结果", () => {
    const mockModels: ModelWithScores[] = [
      makeModel("deepseek-v4", { type: "开源", company: "DeepSeek" }),
      makeModel("gpt-5", { type: "闭源", company: "OpenAI" }),
      makeModel("deepseek-flash", { type: "开源", company: "DeepSeek" }),
    ];
    (getAllModelsUnfiltered as ReturnType<typeof vi.fn>).mockReturnValue(mockModels);

    render(<ModelsPageClient />);

    // 先筛选开源
    fireEvent.click(screen.getByText("models.filterOpen"));
    // 再搜索 deepseek
    fireEvent.change(screen.getByPlaceholderText("models.searchPlaceholder"), {
      target: { value: "deepseek" },
    });

    // 应只显示 deepseek 开源模型（2个）
    expect(screen.getAllByText(/deepseek/).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("gpt-5")).not.toBeInTheDocument();
  });

  it("从 URL query 参数恢复搜索词", () => {
    // 设置 mock URL 参数
    mockSearchParams = new URLSearchParams("?q=deepseek");

    const mockModels: ModelWithScores[] = [
      makeModel("deepseek-v4", { company: "DeepSeek" }),
      makeModel("qwen-max", { company: "Alibaba" }),
    ];
    (getAllModelsUnfiltered as ReturnType<typeof vi.fn>).mockReturnValue(mockModels);

    render(<ModelsPageClient />);

    // 搜索框应显示恢复的 query
    const searchInput = screen.getByDisplayValue("deepseek");
    expect(searchInput).toBeInTheDocument();

    // 只显示 deepseek 模型
    expect(screen.getAllByText(/deepseek/).length).toBeGreaterThanOrEqual(1);
  });
});
