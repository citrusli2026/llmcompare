import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTokenCount(val: number): { value: string; unit: "T" | "B" | "M" | "" } {
  if (val >= 1e12) return { value: (val / 1e12).toFixed(2), unit: "T" };
  if (val >= 1e9) return { value: (val / 1e9).toFixed(1), unit: "B" };
  if (val >= 1e6) return { value: (val / 1e6).toFixed(1), unit: "M" };
  return { value: val.toLocaleString(), unit: "" };
}

export function getTypeBadgeClasses(type: "开源" | "闭源"): string {
  return type === "开源"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
    : "bg-blue-500/10 text-blue-600 dark:text-blue-300";
}
