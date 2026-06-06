"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [clicked, setClicked] = useState(false);
  const timer = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    visibility: "hidden",
  });
  const posCount = useRef(0);

  const position = useCallback(() => {
    if (!ref.current || !innerRef.current) return;
    const trigger = ref.current.getBoundingClientRect();
    const tooltip = innerRef.current.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const tw = tooltip.width || 200; // fallback width before render
    const th = tooltip.height || 60;
    const gap = 8;

    const spaceAbove = trigger.top - gap;
    const spaceBelow = vpH - trigger.bottom - gap;
    const useAbove = spaceAbove >= th || spaceBelow < th;

    let left = trigger.left + trigger.width / 2 - tw / 2;
    left = Math.max(12, Math.min(left, vpW - tw - 12));

    posCount.current += 1;

    setStyle({
      position: "fixed",
      left,
      [useAbove ? "bottom" : "top"]: useAbove
        ? vpH - trigger.top + gap
        : trigger.bottom + gap,
      zIndex: 50,
      visibility: "visible",
    });
  }, []);

  useEffect(() => {
    if (!show) return;

    // Position immediately on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => position());
    });

    // Handle scroll for both hover and click tooltips:
    // - hover: reposition to follow the trigger
    // - click: close the tooltip on scroll
    const onScroll = () => {
      if (clicked) {
        setShow(false);
        setClicked(false);
      } else {
        position();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", position);
    };
  }, [show, clicked, position]);

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

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setShow((s) => !s);
      setClicked((s) => !s);
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
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
    >
      {children}
      {show && (
        <div
          ref={innerRef}
          style={style}
          className="max-w-[75vw] sm:max-w-[280px] whitespace-normal break-words rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-neutral-700"
        >
          {content}
        </div>
      )}
    </span>
  );
}
