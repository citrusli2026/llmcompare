"use client";

import { useState, useRef, useLayoutEffect, useEffect, useCallback } from "react";

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
  const [style, setStyle] = useState<React.CSSProperties>({});

  const position = useCallback(() => {
    if (!ref.current || !innerRef.current) return;
    const trigger = ref.current.getBoundingClientRect();
    const tooltip = innerRef.current.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const tw = tooltip.width || 200;
    const th = tooltip.height || 60;
    const gap = 8;

    const spaceAbove = trigger.top - gap;
    const spaceBelow = vpH - trigger.bottom - gap;
    const useAbove = spaceAbove >= th || spaceBelow < th;

    let left = trigger.left + trigger.width / 2 - tw / 2;
    left = Math.max(12, Math.min(left, vpW - tw - 12));

    setStyle({
      position: "fixed",
      left,
      [useAbove ? "bottom" : "top"]: useAbove
        ? vpH - trigger.top + gap
        : trigger.bottom + gap,
      zIndex: 50,
    });
  }, []);

  // useLayoutEffect fires synchronously after DOM mutation, before paint
  // → tooltip is in correct position before user sees it → no flicker
  useLayoutEffect(() => {
    if (!show) return;
    position();

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

  const toggleTooltip = useCallback(() => {
    // clicked 和 show 必须联动：当 clicked 从 false→true 时 show 保持；
    // 当 clicked 从 true→false 时 show 关闭
    setClicked((prev) => {
      const next = !prev;
      // hover 展开时 show=true, clicked=false, 点击后：
      // next=true, show 设为 true（保持不变）
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
          style={style}
          className="max-w-[75vw] sm:max-w-[280px] whitespace-normal break-words rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-neutral-700"
        >
          {content}
        </div>
      )}
    </span>
  );
}
