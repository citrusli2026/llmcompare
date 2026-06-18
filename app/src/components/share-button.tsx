"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  className?: string;
  size?: "sm" | "md";
  variant?: "outline" | "ghost";
  showLabel?: boolean;
}

export function ShareButton({ className, size = "md", variant = "outline", showLabel = true }: ShareButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((next: "copied" | "failed") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (next === "copied") {
      setCopied(true);
      setFailed(false);
    } else {
      setFailed(true);
      setCopied(false);
    }
    timerRef.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 1800);
  }, []);

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // user cancelled or not supported — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      flash("copied");
    } catch {
      flash("failed");
    }
  }, [flash]);

  const label = failed
    ? t("models.shareFailed")
    : copied
    ? t("models.shareCopied")
    : t("models.share");

  const sizeClass = size === "sm" ? "h-7 px-2 text-[11px]" : "h-9 px-3 text-xs";
  const iconClass = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span className="relative inline-flex">
      <button
        onClick={handleShare}
        data-cta="share"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
          sizeClass,
          variant === "outline"
            ? "border border-surface-border bg-surface-card text-text-primary hover:border-accent-violet/30 hover:bg-surface-hover"
            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
          copied && "border-accent-lime/30 bg-accent-lime/10 text-accent-lime",
          failed && "border-accent-fuchsia/30 bg-accent-fuchsia/10 text-accent-fuchsia",
          className,
        )}
        aria-label={label}
        title={label}
      >
        {copied ? (
          <Check className={iconClass} />
        ) : size === "sm" ? (
          <Link2 className={iconClass} />
        ) : (
          <Share2 className={iconClass} />
        )}
        {showLabel && <span>{label}</span>}
      </button>
      {(copied || failed) && (
        <span
          role="status"
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium shadow-lg animate-in fade-in slide-in-from-top-1",
            copied
              ? "bg-accent-lime text-surface-base"
              : "bg-accent-fuchsia text-white"
          )}
        >
          {copied ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-3 w-3" />
              {t("models.shareCopied")}
            </span>
          ) : (
            t("models.shareFailed")
          )}
        </span>
      )}
    </span>
  );
}
