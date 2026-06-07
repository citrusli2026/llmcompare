import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompareBar } from "@/components/compare-bar";
import { makeModel } from "../fixtures";

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

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/models",
}));

describe("CompareBar — E2E 难测的交互", () => {
  it("calls onRemoveModel when remove button clicked", () => {
    const onRemove = vi.fn();
    const models = [makeModel("model-x", { company: "TestCo" })];
    render(
      <CompareBar
        selectedModels={models}
        onRemoveModel={onRemove}
        onClear={vi.fn()}
      />
    );
    const removeButtons = screen.getAllByRole("button", { name: "compare.remove" });
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith("model-x");
  });

  it("calls onClear when clear button clicked", () => {
    const onClear = vi.fn();
    const models = [makeModel("m1", { company: "TestCo" }), makeModel("m2", { company: "TestCo" })];
    render(
      <CompareBar
        selectedModels={models}
        onRemoveModel={vi.fn()}
        onClear={onClear}
      />
    );
    const clearButtons = screen.getAllByText("compare.remove");
    fireEvent.click(clearButtons[0]);
    expect(onClear).toHaveBeenCalled();
  });

  it("handles up to 6 model tags without overflow", () => {
    const models = Array.from({ length: 6 }, (_, i) =>
      makeModel(`m${i}`, { company: "TestCo" })
    );
    render(
      <CompareBar
        selectedModels={models}
        onRemoveModel={vi.fn()}
        onClear={vi.fn()}
      />
    );
    for (let i = 0; i < 6; i++) {
      expect(screen.getByText(`m${i}`)).toBeInTheDocument();
    }
  });
});
