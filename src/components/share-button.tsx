"use client";

import { useCallback, useState } from "react";
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

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;

    // Try Web Share API first (mobile-friendly)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // user cancelled or not supported — fall through to clipboard
      }
    }

    // Fallback: clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
      setCopied(false);
      setTimeout(() => setFailed(false), 1800);
    }
  }, []);

  const label = failed
    ? t("models.shareFailed")
    : copied
    ? t("models.shareCopied")
    : t("models.share");

  const Icon = copied ? Check : (size === "sm" ? Link2 : Share2);
  const sizeClass = size === "sm" ? "h-7 px-2 text-[11px]" : "h-9 px-3 text-xs";

  return (
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
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {showLabel && <span>{label}</span>}
    </button>
  );
}
