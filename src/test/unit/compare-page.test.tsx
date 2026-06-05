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
        "compare.bestValue": "Best value",
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
  usePathname: () => "/compare",
}));

// Mock scoring to return controlled model data
const mockGetModelById = vi.fn();
vi.mock("@/lib/scoring", () => ({
  getModelById: (id: string) => mockGetModelById(id),
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
      expect(screen.getByText("model-a")).toBeInTheDocument();
      expect(screen.getByText("model-b")).toBeInTheDocument();
      expect(screen.getByText("AlphaCorp")).toBeInTheDocument();
      expect(screen.getByText("BetaInc")).toBeInTheDocument();
    });

    it("renders intelligence scores for all models", () => {
      mockSearchParams = new URLSearchParams("models=model-a,model-b");
      render(<ComparePageClient />);
      expect(screen.getByText("85.50")).toBeInTheDocument();
      expect(screen.getByText("72.30")).toBeInTheDocument();
    });

    it("renders speed column correctly (t/s format)", () => {
      mockSearchParams = new URLSearchParams("models=model-a,model-b");
      render(<ComparePageClient />);
      expect(screen.getByText("120.5 t/s")).toBeInTheDocument();
      expect(screen.getByText("200.0 t/s")).toBeInTheDocument();
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
      expect(screen.getByText("single")).toBeInTheDocument();
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
      // Intelligence row should show em-dash
      const cells = container.querySelectorAll("td");
      const dashCells = Array.from(cells).filter((c) => c.textContent === "—");
      expect(dashCells.length).toBeGreaterThan(0);
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
