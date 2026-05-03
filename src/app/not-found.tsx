import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-base px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
        <SearchX className="h-8 w-8 text-accent-violet" />
      </div>

      <h1 className="mt-6 text-7xl font-bold tracking-tight">
        <span className="bg-gradient-to-br from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
          404
        </span>
      </h1>

      <p className="mt-3 text-lg text-text-secondary">页面未找到</p>
      <p className="mt-1 text-sm text-text-muted">
        你访问的页面不存在或已被移除
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-violet-500/10 px-5 py-2.5 text-sm font-medium text-accent-violet transition-colors hover:bg-violet-500/20"
      >
        <ArrowLeft className="h-4 w-4" />
        返回首页
      </Link>
    </div>
  );
}
