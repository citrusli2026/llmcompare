"use client";

import { useState, useRef } from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timer = useRef(0);

  const handleEnter = () => {
    window.clearTimeout(timer.current);
    setShow(true);
  };

  const handleLeave = () => {
    timer.current = window.setTimeout(() => setShow(false), 100);
  };

  return (
    <span className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
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
