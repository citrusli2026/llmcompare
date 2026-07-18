import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FavoriteButton } from "@/components/favorite-button";

describe("FavoriteButton", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders with default md size", () => {
    render(<FavoriteButton modelId="test" />);
    const btn = screen.getByRole("button");
    expect(btn).toBeTruthy();
    expect(btn.getAttribute("aria-label")).toBeTruthy();
  });

  it("renders as pressed when favorited", () => {
    localStorage.setItem("llmcompare-favorites", JSON.stringify(["test"]));
    render(<FavoriteButton modelId="test" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("renders as unpressed when not favorited", () => {
    render(<FavoriteButton modelId="test" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("toggles favorite on click", () => {
    render(<FavoriteButton modelId="test" />);
    const btn = screen.getByRole("button");

    fireEvent.click(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders with sm size", () => {
    render(<FavoriteButton modelId="test" size="sm" />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("h-7 w-7");
  });

  it("renders with lg size", () => {
    render(<FavoriteButton modelId="test" size="lg" />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("h-9 w-9");
  });

  it("does not propagate click event", () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <FavoriteButton modelId="test" />
      </div>
    );
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
