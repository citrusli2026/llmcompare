"use client";

import { cn } from "@/lib/utils";

export interface FilterOption {
  key: string;
  label: string;
}

interface FilterBarProps {
  options: FilterOption[];
  activeKey: string;
  onFilterChange: (key: string) => void;
}

export function FilterBar({ options, activeKey, onFilterChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onFilterChange(opt.key)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all min-h-9",
            activeKey === opt.key
              ? "bg-accent-violet/20 text-accent-violet border border-accent-violet/40"
              : "bg-surface-card text-text-secondary border border-surface-border hover:bg-surface-hover hover:text-text-primary"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
