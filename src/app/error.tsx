"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[app/error.tsx]", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-base px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20">
        <AlertTriangle className="h-8 w-8 text-rose-500" />
      </div>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
        页面出错了
      </h1>
      <p className="mt-3 text-base text-text-secondary text-center max-w-md">
        数据加载或渲染时发生了意外。已记录问题,你可以重试或返回首页继续浏览。
      </p>

      {error.digest && (
        <p className="mt-2 text-xs text-text-muted font-mono">
          错误码: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-violet px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-violet/90"
        >
          <RefreshCw className="h-4 w-4" />
          重试
        </button>
        <Link
          href="/models"
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-accent-violet/30 hover:text-accent-violet"
        >
          <Home className="h-4 w-4" />
          返回 /models
        </Link>
      </div>
    </div>
  );
}
