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

// Mock next/navigation for useCompareIds
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

describe("RankingTable — E2E 难测的交互", () => {
  it("mobile sort select changes sort order", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
      makeModel("m2", { intelligence: 90 }),
    ];

    render(<RankingTable models={models} />);
    const select = screen.getByDisplayValue("models.colTokens");
    fireEvent.change(select, { target: { value: "intelligence" } });
    // After change, the select should show the new value
    expect(screen.getByDisplayValue("models.colIntelligence")).toBeInTheDocument();
  });

  it("mobile sort select handles empty value as date fallback", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
    ];

    render(<RankingTable models={models} />);
    const select = screen.getByDisplayValue("models.colTokens");
    fireEvent.change(select, { target: { value: "" } });
    // Empty string maps to "date" in handleMobileSortChange
    expect(screen.getByDisplayValue("table.date")).toBeInTheDocument();
  });

  it("desktop sort headers are buttons with aria-sort", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
    ];

    render(<RankingTable models={models} />);

    // 排序表头是可键盘聚焦的 button，所在 th 带 aria-sort
    const tokensBtn = screen.getByRole("button", { name: /models\.colTokens/ });
    expect(tokensBtn.closest("th")).toHaveAttribute("aria-sort", "descending"); // 默认 tokens 降序

    const intelBtn = screen.getByRole("button", { name: /models\.colIntelligence/ });
    expect(intelBtn.closest("th")).toHaveAttribute("aria-sort", "none");

    // 点击智能列 → 该列 aria-sort 变为 descending，tokens 列回到 none
    fireEvent.click(intelBtn);
    expect(intelBtn.closest("th")).toHaveAttribute("aria-sort", "descending");
    expect(tokensBtn.closest("th")).toHaveAttribute("aria-sort", "none");

    // 再点一次 → 切换为 ascending
    fireEvent.click(intelBtn);
    expect(intelBtn.closest("th")).toHaveAttribute("aria-sort", "ascending");
  });
});
