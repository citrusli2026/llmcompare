import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelLogo } from "@/components/model-logo";

describe("ModelLogo", () => {
  it("renders initial letter when no src", () => {
    render(<ModelLogo name="GPT" />);
    expect(screen.getByText("G")).toBeTruthy();
  });

  it("renders img when src is provided", () => {
    const { container } = render(<ModelLogo name="GPT" src="https://example.com/logo.png" />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("https://example.com/logo.png");
  });

  it("hides img on error", () => {
    const { container } = render(<ModelLogo name="GPT" src="https://example.com/broken.png" />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.style.display).not.toBe("none");

    // Simulate error
    img.dispatchEvent(new Event("error"));
    expect(img.style.display).toBe("none");
  });

  it("renders xs size without container", () => {
    const { container } = render(
      <ModelLogo name="GPT" src="https://example.com/logo.png" size="xs" />
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.className).toContain("h-4 w-4");
  });

  it("renders sm size with container", () => {
    const { container } = render(<ModelLogo name="GPT" size="sm" />);
    const containerEl = container.firstChild as HTMLElement;
    expect(containerEl.className).toContain("h-7 w-7");
  });

  it("renders md size with container", () => {
    const { container } = render(<ModelLogo name="GPT" size="md" />);
    const containerEl = container.firstChild as HTMLElement;
    expect(containerEl.className).toContain("h-8 w-8");
  });

  it("renders lg size with border", () => {
    const { container } = render(<ModelLogo name="GPT" size="lg" />);
    const containerEl = container.firstChild as HTMLElement;
    expect(containerEl.className).toContain("h-12 w-12");
    expect(containerEl.className).toContain("border");
  });
});
