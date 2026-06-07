"use client";

import { useReducer, useRef, useLayoutEffect, useEffect, useCallback } from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

type Action =
  | { type: "hover_enter" }
  | { type: "hover_leave" }
  | { type: "click" }
  | { type: "close" };

interface State {
  show: boolean;
  clicked: boolean;
}

function tooltipReducer(state: State, action: Action): State {
  switch (action.type) {
    case "hover_enter":
      if (state.clicked) return state; // click-opened: ignore hover
      return { ...state, show: true };
    case "hover_leave":
      if (state.clicked) return state; // click-opened: ignore hover
      return { ...state, show: false };
    case "click":
      if (state.clicked) return { show: false, clicked: false }; // close
      return { show: true, clicked: true }; // open (stays open even if was hover-shown)
    case "close":
      return { show: false, clicked: false };
  }
}

export function Tooltip({ children, content }: TooltipProps) {
  const [state, dispatch] = useReducer(tooltipReducer, { show: false, clicked: false });
  const { show, clicked } = state;
  const timer = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Position tooltip via ref (no setState → no re-render → no flicker)
  const positionTooltip = useCallback(() => {
    const tip = innerRef.current;
    const trigger = ref.current;
    if (!tip || !trigger) return;

    const tr = trigger.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const gap = 8;

    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    if (tw === 0 || th === 0) return;

    // Decide direction
    const spaceAbove = tr.top - gap;
    const spaceBelow = vpH - tr.bottom - gap;
    const showAbove = spaceAbove >= spaceBelow;

    // Calculate position
    let top = showAbove ? tr.top - th - gap : tr.bottom + gap;
    if (top < 4) top = 4;
    if (top + th > vpH - 4) top = vpH - th - 4;

    let left = tr.left + tr.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, vpW - tw - 8));

    // Direct DOM — no re-render
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.style.opacity = "1";
    tip.style.pointerEvents = "auto";
    tip.setAttribute("data-above", showAbove ? "true" : "false");
  }, []);

  useLayoutEffect(() => {
    if (!show) return;
    // rAF ensures tooltip dimensions are settled after DOM commit
    const raf = requestAnimationFrame(() => positionTooltip());

    const reposition = () => {
      if (state.clicked) {
        dispatch({ type: "close" });
      } else {
        requestAnimationFrame(() => positionTooltip());
      }
    };

    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", positionTooltip);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", positionTooltip);
    };
  }, [state.show, state.clicked, positionTooltip]);

  // Outside click → close (click-opened tooltips only)
  useEffect(() => {
    if (!state.show || !state.clicked) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        dispatch({ type: "close" });
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [state.show, state.clicked]);

  const handleEnter = useCallback(() => {
    window.clearTimeout(timer.current);
    dispatch({ type: "hover_enter" });
  }, []);

  const handleLeave = useCallback(() => {
    timer.current = window.setTimeout(() => dispatch({ type: "hover_leave" }), 150);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      dispatch({ type: "click" });
    },
    []
  );

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
      aria-describedby={show ? "tooltip-content" : undefined}
    >
      {children}
      {show && (
        <div
          ref={innerRef}
          id="tooltip-content"
          role="tooltip"
          style={{
            position: "fixed",
            zIndex: 9999,
            opacity: 0,
            pointerEvents: "none",
            left: 0,
            top: 0,
          }}
          className="w-max min-w-[120px] max-w-[75vw] sm:max-w-[280px] whitespace-normal break-words rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg bg-gray-900 text-white"
        >
          {content}
        </div>
      )}
    </span>
  );
}
