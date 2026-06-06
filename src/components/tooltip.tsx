"use client";

import { useState, useRef, useLayoutEffect, useEffect, useCallback } from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [above, setAbove] = useState(false);
  const timer = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Position tooltip with CSS only, then correct viewport overflow via ref
  const correctOverflow = useCallback(() => {
    if (!ref.current || !innerRef.current) return;
    const trigger = ref.current.getBoundingClientRect();
    const tipRect = innerRef.current.getBoundingClientRect();
    const vpW = window.innerWidth;

    // Correct horizontal overflow
    if (tipRect.right > vpW) {
      innerRef.current.style.left = `${vpW - tipRect.width - 12}px`;
    } else if (tipRect.left < 12) {
      innerRef.current.style.left = "12px";
    } else {
      // Reset to CSS default (centered)
      innerRef.current.style.left = "";
    }
  }, []);

  // Decide above/below based on available space (triggers re-render but
  // tooltip is already in CSS position → no flicker, only height flip)
  const decideDirection = useCallback(() => {
    if (!ref.current) return;
    const trigger = ref.current.getBoundingClientRect();
    const vpH = window.innerHeight;
    const gap = 8;
    const spaceAbove = trigger.top - gap;
    const spaceBelow = vpH - trigger.bottom - gap;
    // Use above if there's more space above OR not enough below
    setAbove(spaceAbove >= spaceBelow);
  }, []);

  // useLayoutEffect: correct overflow after DOM is committed, before paint
  useLayoutEffect(() => {
    if (!show) return;
    decideDirection();
    // Use rAF to ensure tooltip dimensions are settled after direction flip
    const raf = requestAnimationFrame(() => {
      correctOverflow();
    });

    const onScroll = () => {
      if (clicked) {
        setShow(false);
        setClicked(false);
      } else {
        decideDirection();
        requestAnimationFrame(() => {
          correctOverflow();
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      decideDirection();
      requestAnimationFrame(() => {
        correctOverflow();
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [show, clicked, decideDirection, correctOverflow]);

  // Outside click → close (click-opened tooltips only)
  useEffect(() => {
    if (!show || !clicked) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
        setClicked(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [show, clicked]);

  const handleEnter = useCallback(() => {
    if (clicked) return;
    window.clearTimeout(timer.current);
    setShow(true);
  }, [clicked]);

  const handleLeave = useCallback(() => {
    if (clicked) return;
    timer.current = window.setTimeout(() => setShow(false), 150);
  }, [clicked]);

  const toggleTooltip = useCallback(() => {
    setClicked((prev) => {
      const next = !prev;
      setShow(next);
      return next;
    });
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      toggleTooltip();
    },
    [toggleTooltip]
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
          data-above={above ? "true" : "false"}
          className={[
            "max-w-[75vw] sm:max-w-[280px] whitespace-normal break-words rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg",
            "bg-gray-900 text-white dark:bg-neutral-700",
            "absolute left-1/2 -translate-x-1/2 z-50",
            above
              ? "bottom-full mb-2"
              : "top-full mt-2",
          ].join(" ")}
        >
          {content}
        </div>
      )}
    </span>
  );
}
