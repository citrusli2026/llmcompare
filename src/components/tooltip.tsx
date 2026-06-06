"use client";

import { useState, useRef, useEffect } from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [clicked, setClicked] = useState(false);
  const timer = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);

  // Outside click → close (for click-opened tooltips on mobile/desktop)
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

  const handleEnter = () => {
    // Don't override a click-opened tooltip
    if (clicked) return;
    window.clearTimeout(timer.current);
    setShow(true);
  };

  const handleLeave = () => {
    if (clicked) return;
    timer.current = window.setTimeout(() => setShow(false), 150);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newShow = !show;
    setShow(newShow);
    setClicked(newShow);
  };

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
    >
      {children}
      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <span className="whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-neutral-700">
            {content}
          </span>
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-neutral-700" />
        </span>
      )}
    </span>
  );
}
