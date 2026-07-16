"use client";

import { cn } from "@/lib/utils";

interface ModelLogoProps {
  src?: string | null;
  name: string;
  /** Size preset — maps to container + image Tailwind classes */
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  xs: { container: "h-4 w-4", text: "text-[10px]", img: "h-4 w-4 rounded" },
  sm: { container: "h-7 w-7 rounded", text: "text-xs", img: "h-5 w-5 object-contain" },
  md: { container: "h-8 w-8 rounded", text: "text-xs", img: "h-5 w-5 object-contain" },
  lg: { container: "h-12 w-12 sm:h-16 sm:w-16 rounded-xl", text: "text-xl sm:text-2xl", img: "h-12 w-12 sm:h-16 sm:w-16 rounded-xl object-contain" },
} as const;

/**
 * Reusable model logo with fallback initial.
 * Single source of truth for the logo+fallback pattern across the app.
 */
export function ModelLogo({ src, name, size = "sm", className }: ModelLogoProps) {
  const s = SIZE_MAP[size];

  if (size === "xs") {
    // Inline minimal variant — no container wrapper
    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn(s.img, "shrink-0", className)}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    ) : null;
  }

  return (
    <div className={cn(
      s.container,
      "shrink-0 bg-surface-base flex items-center justify-center overflow-hidden",
      size === "lg" && "border border-surface-border p-1.5 sm:p-2",
      className,
    )}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={s.img}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <span className={cn("font-bold text-text-muted", s.text)}>
          {name.charAt(0)}
        </span>
      )}
    </div>
  );
}
