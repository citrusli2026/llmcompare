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

// Mock scoring.ts getAllModelsUnfiltered + getModelById
vi.mock("@/lib/scoring", async () => {
  const actual = await vi.importActual<typeof import("@/lib/scoring")>("@/lib/scoring");
  const _models: Record<string, ModelWithScores> = {};
  return {
    ...actual,
    getAllModelsUnfiltered: vi.fn(),
    getModelById: vi.fn((id: string) => _models[id] ?? undefined),
  };
});

import { getAllModelsUnfiltered, getModelById } from "@/lib/scoring";
import { makeModel } from "../fixtures";

// Helper to register models for getModelById mock
function registerModels(models: ModelWithScores[]) {
  (getModelById as ReturnType<typeof vi.fn>).mockImplementation(
    (id: string) => models.find((m) => m.id === id) ?? undefined
  );
}

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

  it("CompareBar 显示已选模型 (来自 URL param)", () => {
    const mockModels: ModelWithScores[] = [
      makeModel("compare-model-1"),
      makeModel("compare-model-2"),
      makeModel("other-model"),
    ];
    (getAllModelsUnfiltered as ReturnType<typeof vi.fn>).mockReturnValue(mockModels);
    registerModels(mockModels);

    mockSearchParams = new URLSearchParams("?compare=compare-model-1,compare-model-2");
    render(<ModelsPageClient />);

    // CompareBar 应显示两个模型名（模型名既在行中也在 CompareBar 中，用 getAllByText 检查）
    const model1Elements = screen.getAllByText("compare-model-1");
    expect(model1Elements.length).toBeGreaterThanOrEqual(1);
    const model2Elements = screen.getAllByText("compare-model-2");
    expect(model2Elements.length).toBeGreaterThanOrEqual(1);
    // CompareBar 的"开始对比"按钮应存在
    expect(screen.getByText(/compare.compareNow/)).toBeInTheDocument();
  });

  it("CompareBar 无选中模型时不显示", () => {
    const mockModels: ModelWithScores[] = [
      makeModel("model-1"),
      makeModel("model-2"),
    ];
    (getAllModelsUnfiltered as ReturnType<typeof vi.fn>).mockReturnValue(mockModels);

    mockSearchParams = new URLSearchParams();
    render(<ModelsPageClient />);

    // CompareBar 不应渲染任何模型标签
    expect(screen.queryByText("compare.compareNow")).not.toBeInTheDocument();
  });
});
