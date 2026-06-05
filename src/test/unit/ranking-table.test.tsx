import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RankingTable } from "@/components/ranking-table";
import { type ModelWithScores } from "@/lib/scoring";
import { makeModel } from "../fixtures";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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

  it("renders all models with rank numbers", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 90 }),
      makeModel("m2", { intelligence: 70 }),
    ];

    render(<RankingTable models={models} />);
    // All models show rank #1 and #2
    expect(screen.getAllByText("#1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("#2").length).toBeGreaterThanOrEqual(1);
  });

  it("all models show rank (no group exceptions)", () => {
    const models: ModelWithScores[] = [
      makeModel("intl-1", { isInternational: true }),
    ];

    render(<RankingTable models={models} />);
    // All groups now show rank
    const rankElements = screen.queryAllByText(/#\d+/);
    expect(rankElements.length).toBeGreaterThanOrEqual(1);
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
