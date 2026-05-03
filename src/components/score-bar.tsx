"use client";

import { cn } from "@/lib/utils";

interface ScoreBarProps {
  score: number | null;
  label: string;
  className?: string;
}

export function ScoreBar({ score, label, className }: ScoreBarProps) {
  const getColor = (s: number) => {
    if (s >= 85) return "bg-emerald-500";
    if (s >= 70) return "bg-blue-500";
    if (s >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  if (score === null || score === undefined) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <span className="w-16 text-xs text-text-muted shrink-0">{label}</span>
        <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-surface-border" style={{ width: "100%" }} />
        </div>
        <span className="w-14 text-xs font-medium text-text-dim text-right">
          缺数据
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="w-16 text-xs text-text-muted shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            getColor(score)
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-8 text-xs font-semibold text-text-primary text-right">
        {score % 1 === 0 ? score : score.toFixed(1)}
      </span>
    </div>
  );
}
