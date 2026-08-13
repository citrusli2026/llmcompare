import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Tooltip } from "@/components/tooltip";

describe("Tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children", () => {
    render(
      <Tooltip content="tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("shows tooltip content on hover enter", () => {
    render(
      <Tooltip content="helpful info">
        <span>target</span>
      </Tooltip>
    );

    const target = screen.getByText("target");
    expect(screen.queryByText("helpful info")).not.toBeInTheDocument();

    fireEvent.mouseEnter(target);
    expect(screen.getByText("helpful info")).toBeInTheDocument();
  });

  it("hides tooltip content on hover leave after delay", () => {
    render(
      <Tooltip content="helpful info">
        <span>target</span>
      </Tooltip>
    );

    const target = screen.getByText("target");
    fireEvent.mouseEnter(target);
    expect(screen.getByText("helpful info")).toBeInTheDocument();

    fireEvent.mouseLeave(target);
    // Should still be visible during the 150ms delay
    expect(screen.getByText("helpful info")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(screen.queryByText("helpful info")).not.toBeInTheDocument();
  });

  it("clicking toggles tooltip visibility", () => {
    render(
      <Tooltip content="click info">
        <span>target</span>
      </Tooltip>
    );

    const target = screen.getByText("target");
    // Click to open
    fireEvent.click(target);
    expect(screen.getByText("click info")).toBeInTheDocument();

    // Click again to close
    fireEvent.click(target);
    expect(screen.queryByText("click info")).not.toBeInTheDocument();
  });

  it("clicking outside closes tooltip when opened by click", () => {
    render(
      <div>
        <Tooltip content="click info">
          <span>target</span>
        </Tooltip>
        <span data-testid="outside">outside</span>
      </div>
    );

    const target = screen.getByText("target");
    fireEvent.click(target);
    expect(screen.getByText("click info")).toBeInTheDocument();

    // Click outside
    const outside = screen.getByTestId("outside");
    fireEvent.mouseDown(outside);
    expect(screen.queryByText("click info")).not.toBeInTheDocument();
  });

  it("hover after click does not close tooltip", () => {
    render(
      <Tooltip content="sticky info">
        <span>target</span>
      </Tooltip>
    );

    const target = screen.getByText("target");

    // Click to open
    fireEvent.click(target);
    expect(screen.getByText("sticky info")).toBeInTheDocument();

    // Hover leave should NOT close it (clicked state)
    fireEvent.mouseLeave(target);
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(screen.getByText("sticky info")).toBeInTheDocument();
  });

  it("click closes hover-opened tooltip properly", () => {
    render(
      <Tooltip content="hover then click">
        <span>target</span>
      </Tooltip>
    );

    const target = screen.getByText("target");

    // Hover to open
    fireEvent.mouseEnter(target);
    expect(screen.getByText("hover then click")).toBeInTheDocument();

    // Click — should keep open (clicked state takes over)
    fireEvent.click(target);
    expect(screen.getByText("hover then click")).toBeInTheDocument();

    // Click again — should close
    fireEvent.click(target);
    expect(screen.queryByText("hover then click")).not.toBeInTheDocument();
  });

  it("scroll closes click-opened tooltip", () => {
    render(
      <Tooltip content="scroll-close">
        <span>target</span>
      </Tooltip>
    );

    const target = screen.getByText("target");
    fireEvent.click(target);
    expect(screen.getByText("scroll-close")).toBeInTheDocument();

    // Scroll event should close it
    fireEvent.scroll(window);
    expect(screen.queryByText("scroll-close")).not.toBeInTheDocument();
  });

  it("sets aria-describedby and role attributes when visible", () => {
    render(
      <Tooltip content="accessible info">
        <span>target</span>
      </Tooltip>
    );

    const target = screen.getByText("target");
    expect(target.parentElement).not.toHaveAttribute("aria-describedby");

    fireEvent.mouseEnter(target);
    const trigger = target.parentElement!;
    // id 由 useId 生成(唯一), aria-describedby 必须指向 tooltip 自身的 id
    const describedBy = trigger.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.id).toBe(describedBy);
    expect(tooltip).toHaveTextContent("accessible info");
  });

  it("multiple tooltips get unique ids (no duplicate id attr)", () => {
    render(
      <>
        <Tooltip content="tip one">
          <span>one</span>
        </Tooltip>
        <Tooltip content="tip two">
          <span>two</span>
        </Tooltip>
      </>
    );

    fireEvent.mouseEnter(screen.getByText("one"));
    fireEvent.mouseEnter(screen.getByText("two"));

    const ids = screen.getAllByRole("tooltip").map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("opens on keyboard focus and closes on Escape", () => {
    render(
      <Tooltip content="keyboard info">
        <button>focus me</button>
      </Tooltip>
    );

    const btn = screen.getByText("focus me");
    expect(screen.queryByText("keyboard info")).not.toBeInTheDocument();

    fireEvent.focus(btn);
    expect(screen.getByText("keyboard info")).toBeInTheDocument();

    fireEvent.keyDown(btn, { key: "Escape" });
    expect(screen.queryByText("keyboard info")).not.toBeInTheDocument();
  });
});
