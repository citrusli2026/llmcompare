import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparePageClient } from "@/app/compare/compare-client";
import { makeModel } from "../fixtures";

// ── Shared mock state for search params ──
let mockSearchParams = new URLSearchParams();

// ── Mocks ──
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params) {
        return key.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
      }
      // Return a recognizable value for specific keys
      const labels: Record<string, string> = {
        "compare.noModels": "No models selected",
        "compare.noModelsDesc": "Select models to compare their capabilities",
        "compare.title": "Model Comparison",
        "compare.colName": "Metric",
        "compare.bestValue": "Best in this column",
        "compare.verdictTitle": "Quick Verdict",
        "compare.intelligence": "Intelligence",
        "compare.coding": "Coding",
        "compare.agentic": "Agentic",
        "compare.speed": "Speed",
        "compare.price": "Price",
        "compare.arenaVotes": "Arena Votes",
        "compare.contextWindow": "Context Window",
        "compare.parameters": "Parameters",
        "compare.releaseDate": "Release Date",
        "common.reasoning": "Reasoning",
        "common.imageInput": "Image Input",
        "common.openWeights": "Open Weights",
        "compare.benchmarkGpqa": "GPQA",
        "compare.benchmarkHle": "HLE",
        "nav.models": "Models",
        "product.backLink": "Back",
        "common.open": "Open Source",
        "common.closed": "Closed",
      };
      return labels[key] ?? key;
    },
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock next/navigation — shared state allows per-test param injection
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  useParams: () => ({ ids: undefined }),
  usePathname: () => "/compare",
}));

// Mock scoring to return controlled model data
// Mock scoring to return controlled model data
const mockGetModelById = vi.fn();
// Provide minimal models for recommendation-tags which calls getAllModels internally
const mockAllModels = vi.hoisted(() => {
  return [
    {
      id: "model-a", name: "model-a", company: "Test", type: "开源" as const,
      logo: "", url: "", vendor_links: {},
      raw: {
        intelligence: 60, coding: 55, agentic: 50,
        median_tps: null, ttft_seconds: null, e2e_seconds: null,
        p05_tps: null, p95_tps: null,
        input: null, output: null, blended: null, display: "",
        cn_input: null, cn_output: null, cn_display: null,
        isInternational: true,
        context_window: null, parameters: null, output_tokens: null,
        release_date: null, omniscience: null,
        arena_votes: null, openrouter_weekly_tokens: null,
        openrouter_pricing: null, arena_rankings: null, arena_code: null,
        data_completeness_pct: 0,
        benchmarks: { gpqa: null, hle: null, mmlu_pro: null },
      },
      flags: { frontier: false, open_weights: false, reasoning: false, image_input: false, chinese_eval: false, has_speed: false, data_complete: false },
    },
    {
      id: "model-b", name: "model-b", company: "Test", type: "开源" as const,
      logo: "", url: "", vendor_links: {},
      raw: {
        intelligence: 50, coding: 45, agentic: 60,
        median_tps: null, ttft_seconds: null, e2e_seconds: null,
        p05_tps: null, p95_tps: null,
        input: null, output: null, blended: null, display: "",
        cn_input: null, cn_output: null, cn_display: null,
        isInternational: true,
        context_window: null, parameters: null, output_tokens: null,
        release_date: null, omniscience: null,
        arena_votes: null, openrouter_weekly_tokens: null,
        openrouter_pricing: null, arena_rankings: null, arena_code: null,
        data_completeness_pct: 0,
        benchmarks: { gpqa: null, hle: null, mmlu_pro: null },
      },
      flags: { frontier: false, open_weights: false, reasoning: false, image_input: false, chinese_eval: false, has_speed: false, data_complete: false },
    },
  ];
});
vi.mock("@/lib/scoring", () => ({
  getModelById: (id: string) => mockGetModelById(id),
  getAllModels: () => mockAllModels,
}));

describe("ComparePageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe("empty state", () => {
    it("shows no-models placeholder when no query param", () => {
      mockSearchParams = new URLSearchParams();
      render(<ComparePageClient />);
      expect(screen.getByText("No models selected")).toBeInTheDocument();
      expect(screen.getByText("Select models to compare their capabilities")).toBeInTheDocument();
    });

    it("shows no-models placeholder when models param is empty", () => {
      mockSearchParams = new URLSearchParams("models=");
      render(<ComparePageClient />);
      expect(screen.getByText("No models selected")).toBeInTheDocument();
    });
  });

  describe("with models", () => {
    const modelA = makeModel("model-a", {
      company: "AlphaCorp",
      intelligence: 85.5,
      coding: 78.0,
      agentic: 90.2,
      median_tps: 120.5,
      context_window: 128000,
      release_date: "2025-06-01",
    });
    const modelB = makeModel("model-b", {
      company: "BetaInc",
      intelligence: 72.3,
      coding: 65.0,
      agentic: 80.0,
      median_tps: 200.0,
      context_window: 64000,
      release_date: "2024-12-15",
    });

    beforeEach(() => {
      mockGetModelById.mockImplementation((id: string) => {
        if (id === "model-a") return modelA;
        if (id === "model-b") return modelB;
        return null;
      });
    });

    it("renders model names and companies", () => {
      mockSearchParams = new URLSearchParams("models=model-a,model-b");
      render(<ComparePageClient />);
      expect(screen.getAllByText("model-a").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("model-b").length).toBeGreaterThanOrEqual(1);
      // Both mobile and desktop views render company — use getAll
      expect(screen.getAllByText("AlphaCorp").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("BetaInc").length).toBeGreaterThanOrEqual(1);
    });

    it("renders intelligence scores for all models", () => {
      mockSearchParams = new URLSearchParams("models=model-a,model-b");
      render(<ComparePageClient />);
      // Both mobile and desktop views render scores — use getAll
      expect(screen.getAllByText("85.50").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("72.30").length).toBeGreaterThanOrEqual(1);
    });

    it("renders speed column correctly (t/s format)", () => {
      mockSearchParams = new URLSearchParams("models=model-a,model-b");
      render(<ComparePageClient />);
      // Both mobile and desktop views render speed — use getAll
      expect(screen.getAllByText("120.5 t/s").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("200.0 t/s").length).toBeGreaterThanOrEqual(1);
    });

    it("highlights best values", () => {
      mockSearchParams = new URLSearchParams("models=model-a,model-b");
      const { container } = render(<ComparePageClient />);
      // Model A has higher intelligence → should be highlighted
      const stars = container.querySelectorAll("svg.text-accent-lime");
      expect(stars.length).toBeGreaterThan(0);
    });

    it("counts models in header", () => {
      mockSearchParams = new URLSearchParams("models=model-a,model-b");
      render(<ComparePageClient />);
      expect(screen.getByText(/2 Models/)).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles single model comparison", () => {
      const single = makeModel("single", { company: "SoloCo", intelligence: 90 });
      mockGetModelById.mockImplementation((id: string) =>
        id === "single" ? single : null
      );
      mockSearchParams = new URLSearchParams("models=single");
      render(<ComparePageClient />);
      // Both mobile and desktop views render model name — use getAll
      expect(screen.getAllByText("single").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/1 Models/)).toBeInTheDocument();
    });

    it("handles null intelligence gracefully", () => {
      const nullIntel = makeModel("none", {
        company: "NoScoreCo",
        intelligence: null as unknown as number,
      });
      mockGetModelById.mockImplementation((id: string) =>
        id === "none" ? nullIntel : null
      );
      mockSearchParams = new URLSearchParams("models=none");
      const { container } = render(<ComparePageClient />);
      // Intelligence row with no data is hidden (filtered out by visibleRows).
      // Check that other rows still render and page doesn't crash.
      const labels = container.querySelectorAll("th, td");
      expect(labels.length).toBeGreaterThan(0);
    });

    it("handles unknown model id (returns null from getModelById)", () => {
      mockGetModelById.mockReturnValue(null);
      mockSearchParams = new URLSearchParams("models=nonexistent");
      render(<ComparePageClient />);
      // Falls back to empty state when no valid models
      expect(screen.getByText("No models selected")).toBeInTheDocument();
    });
  });
});
