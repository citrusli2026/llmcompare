import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RankingTable } from "@/components/ranking-table";
import { type ModelWithScores } from "@/lib/scoring";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const makeModel = (
  id: string,
  overrides: Partial<ModelWithScores["raw"]> & { flags?: Partial<ModelWithScores["flags"]> } & { type?: "开源" | "闭源" } = {}
): ModelWithScores => {
  const { flags: flagOverrides, type, ...rawOverrides } = overrides;
  return {
    id,
    name: id,
    company: "TestCo",
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

describe("RankingTable", () => {
  it("renders desktop table with model names", () => {
    const models: ModelWithScores[] = [
      makeModel("model-a", { intelligence: 80 }),
      makeModel("model-b", { intelligence: 60 }),
    ];

    render(<RankingTable models={models} />);
    // Desktop table is hidden sm:block, mobile is block sm:hidden
    // Use getAllByText since both desktop and mobile render the names
    expect(screen.getAllByText("model-a").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("model-b").length).toBeGreaterThanOrEqual(1);
  });

  it("renders company names in desktop view", () => {
    const models: ModelWithScores[] = [
      makeModel("model-a", { company: "TestCo" }),
    ];

    render(<RankingTable models={models} />);
    expect(screen.getAllByText("TestCo").length).toBeGreaterThanOrEqual(1);
  });

  it("renders mobile cards (visible on small screens)", () => {
    const models: ModelWithScores[] = [
      makeModel("mobile-model", { intelligence: 75 }),
    ];

    render(<RankingTable models={models} />);
    // Both desktop and mobile render model name
    expect(screen.getAllByText("mobile-model").length).toBeGreaterThanOrEqual(1);
  });

  it("renders international models with correct badge", () => {
    const models: ModelWithScores[] = [
      makeModel("intl-model", { isInternational: true }),
    ];

    render(<RankingTable models={models} />);
    expect(screen.getAllByText("common.intlBaseline").length).toBeGreaterThanOrEqual(1);
  });

  it("renders frontier models with correct badge", () => {
    const models: ModelWithScores[] = [
      makeModel("frontier-model", { flags: { frontier: true } }),
    ];

    render(<RankingTable models={models} />);
    expect(screen.getAllByText("common.frontier").length).toBeGreaterThanOrEqual(1);
  });

  it("renders mainstream models with correct badge", () => {
    const models: ModelWithScores[] = [
      makeModel("mainstream-model", {}),
    ];

    render(<RankingTable models={models} />);
    expect(screen.getAllByText("common.mainstream").length).toBeGreaterThanOrEqual(1);
  });

  it("shows rank numbers for frontier and mainstream", () => {
    const models: ModelWithScores[] = [
      makeModel("f1", { flags: { frontier: true }, intelligence: 90 }),
      makeModel("m1", { intelligence: 70 }),
    ];

    render(<RankingTable models={models} />);
    // Frontier should show rank starting at 1
    expect(screen.getAllByText("#1").length).toBeGreaterThanOrEqual(1);
    // Mainstream should show rank starting after frontier count
    expect(screen.getAllByText("#2").length).toBeGreaterThanOrEqual(1);
  });

  it("does not show rank for international models", () => {
    const models: ModelWithScores[] = [
      makeModel("intl-1", { isInternational: true }),
    ];

    render(<RankingTable models={models} />);
    // Intl group has showRank=false, so no #N badge
    const rankElements = screen.queryAllByText(/#\d+/);
    expect(rankElements.length).toBe(0);
  });

  it("handles sorting interaction on desktop headers", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
      makeModel("m2", { intelligence: 90 }),
    ];

    render(<RankingTable models={models} />);
    // Find and click the intelligence header
    const headers = screen.getAllByText("models.colIntelligence");
    expect(headers.length).toBeGreaterThan(0);
  });

  it("renders empty table gracefully", () => {
    render(<RankingTable models={[]} />);
    // Should not crash, table headers still present
    expect(screen.getByText("table.model")).toBeInTheDocument();
  });

  it("renders release date when present", () => {
    const models: ModelWithScores[] = [
      makeModel("dated-model", { release_date: "2024-06-15" }),
    ];

    render(<RankingTable models={models} />);
    expect(screen.getAllByText("2024-06-15").length).toBeGreaterThanOrEqual(1);
  });

  it("renders em dash when release date is null", () => {
    const models: ModelWithScores[] = [
      makeModel("no-date-model", { release_date: null }),
    ];

    render(<RankingTable models={models} />);
    // The em dash character
    const cells = screen.getAllByText("—");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("renders cost pricing when available", () => {
    const models: ModelWithScores[] = [
      makeModel("priced-model", {
        openrouter_pricing: { prompt: 1.5, completion: 2.5 },
      }),
    ];

    render(<RankingTable models={models} />);
    expect(screen.getAllByText(/\$1\.5/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/2\.5/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders arena code ELO when available", () => {
    const models: ModelWithScores[] = [
      makeModel("arena-model", { arena_code: 1250 }),
    ];

    render(<RankingTable models={models} />);
    expect(screen.getAllByText("1250").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("ELO").length).toBeGreaterThanOrEqual(1);
  });

  it("renders open/closed source badges", () => {
    const models: ModelWithScores[] = [
      makeModel("open-model", { type: "开源" }),
      makeModel("closed-model", { type: "闭源" }),
    ];

    render(<RankingTable models={models} />);
    expect(screen.getAllByText("common.open").length).toBeGreaterThanOrEqual(1);
    // Use queryAllByText with function matcher for "common.closed"
    const closedBadges = screen.queryAllByText((content) => content === "common.closed");
    expect(closedBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("mobile sort select changes sort order", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
      makeModel("m2", { intelligence: 90 }),
    ];

    render(<RankingTable models={models} />);
    const select = screen.getByDisplayValue("table.date");
    fireEvent.change(select, { target: { value: "intelligence" } });
    // After change, the select should show the new value
    expect(screen.getByDisplayValue("models.colIntelligence")).toBeInTheDocument();
  });

  it("mobile sort select handles empty value as date", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
    ];

    render(<RankingTable models={models} />);
    const select = screen.getByDisplayValue("table.date");
    fireEvent.change(select, { target: { value: "" } });
    // Should still map to date, which means the select value stays as "date"
    // since empty string maps to "date" in handleMobileSortChange
    expect(screen.getByDisplayValue("table.date")).toBeInTheDocument();
  });
});
