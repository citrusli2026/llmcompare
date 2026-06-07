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

describe("CompareBar", () => {
  it("renders nothing when no models selected", () => {
    const { container } = render(
      <CompareBar
        selectedModels={[]}
        onRemoveModel={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows selected models with names", () => {
    const models = [
      makeModel("model-a", { company: "TestCo" }),
      makeModel("model-b", { company: "TestCo" }),
    ];
    render(
      <CompareBar
        selectedModels={models}
        onRemoveModel={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText("model-a")).toBeInTheDocument();
    expect(screen.getByText("model-b")).toBeInTheDocument();
  });

  it("displays model count", () => {
    const models = [
      makeModel("m1", { company: "TestCo" }),
      makeModel("m2", { company: "TestCo" }),
      makeModel("m3", { company: "TestCo" }),
    ];
    render(
      <CompareBar
        selectedModels={models}
        onRemoveModel={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

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
    // Find all remove buttons (can be multiple)
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
    // The clear button in our design is just text "compare.remove"
    const clearButtons = screen.getAllByText("compare.remove");
    fireEvent.click(clearButtons[0]);
    expect(onClear).toHaveBeenCalled();
  });

  it("navigates to compare page on compare click", () => {
    mockPush.mockClear();
    const models = [
      makeModel("m1", { company: "TestCo" }),
      makeModel("m2", { company: "TestCo" }),
    ];
    render(
      <CompareBar
        selectedModels={models}
        onRemoveModel={vi.fn()}
        onClear={vi.fn()}
      />
    );
    const compareBtn = screen.getByText(/compare.compareNow/);
    fireEvent.click(compareBtn);
    expect(mockPush).toHaveBeenCalledWith("/compare/m1/m2");
  });

  it("handles single model correctly", () => {
    const models = [makeModel("single", { company: "TestCo" })];
    render(
      <CompareBar
        selectedModels={models}
        onRemoveModel={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText("single")).toBeInTheDocument();
  });

  it("handles up to 6 models", () => {
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
