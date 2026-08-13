/**
 * Loading skeleton组件 — 替换所有空的 Suspense fallback
 * 使用 Tailwind v4 design tokens (bg-surface-elevated, bg-surface-border 等)
 */

function SkeletonBar({ className = "", style }: { className?: string; style?: Record<string, string> }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-elevated ${className}`}
      style={{ animationDuration: "1.5s", ...style }}
    />
  );
}

function SkeletonCircle({ size = 10 }: { size?: number }) {
  return (
    <div
      className={`animate-pulse rounded-full bg-surface-elevated`}
      style={{ width: size * 4, height: size * 4, animationDuration: "1.5s" }}
    />
  );
}

export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-surface-base">
      {/* Navbar placeholder */}
      <div className="h-16 border-b border-surface-border" />

      {/* Hero section */}
      <div className="px-4 pt-10 sm:pt-16 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Badge */}
          <div className="flex justify-center mb-4">
            <SkeletonBar className="h-6 w-28" />
          </div>
          {/* Title */}
          <SkeletonBar className="h-10 sm:h-12 md:h-14 lg:h-16 mx-auto mb-3" style={{ maxWidth: "70%" }} />
          {/* Subtitle */}
          <SkeletonBar className="h-4 w-3/4 mx-auto mb-6" />
          {/* CTA */}
          <div className="flex justify-center">
            <SkeletonBar className="h-10 w-40 rounded-full" />
          </div>
        </div>
      </div>

      {/* Scene cards placeholder */}
      <div className="px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-surface-border bg-surface-card p-4">
                <SkeletonBar className="h-4 w-16 mb-2" />
                <SkeletonBar className="h-3 w-24 mb-3" />
                <SkeletonBar className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-surface-border bg-surface-card p-4">
                <div className="flex items-center gap-2">
                  <SkeletonCircle size={3} />
                  <SkeletonBar className="h-3 w-16" />
                </div>
                <SkeletonBar className="h-8 w-12 mt-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModelsSkeleton() {
  return (
    <div className="min-h-screen bg-surface-base">
      <div className="h-16 border-b border-surface-border" />

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Search + filters bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <SkeletonBar className="h-9 w-60" />
            <SkeletonBar className="h-9 w-16" />
            <SkeletonBar className="h-9 w-24" />
            <SkeletonBar className="h-9 w-20" />
            <SkeletonBar className="h-9 w-20" />
            <SkeletonBar className="h-9 w-24" />
          </div>

          {/* Table skeleton */}
          <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden">
            {/* Header */}
            <div className="flex border-b border-surface-border px-4 py-3">
              <SkeletonBar className="h-4 w-24" />
              <div className="flex-1" />
              <SkeletonBar className="h-4 w-16 ml-4" />
              <SkeletonBar className="h-4 w-12 ml-4" />
              <SkeletonBar className="h-4 w-14 ml-4" />
              <SkeletonBar className="h-4 w-10 ml-4" />
            </div>
            {/* Rows */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className={`flex items-center px-4 py-3.5 border-b border-surface-border last:border-b-0 ${
                  i % 2 === 0 ? "bg-surface-elevated" : ""
                }`}
              >
                <SkeletonBar className="h-4 w-5" />
                <div className="flex items-center gap-2 ml-3 flex-1">
                  <SkeletonCircle size={2.5} />
                  <SkeletonBar className="h-4 w-28" />
                </div>
                <SkeletonBar className="h-4 w-14 ml-auto" />
                <SkeletonBar className="h-4 w-10 ml-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-surface-base">
      <div className="h-16 border-b border-surface-border" />

      <div className="px-4 py-6 sm:py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Back link */}
          <SkeletonBar className="h-4 w-24 mb-8" />

          {/* Model header */}
          <div className="flex items-center gap-3 mb-6">
            <SkeletonCircle size={5} />
            <div>
              <SkeletonBar className="h-7 w-40 mb-1" />
              <SkeletonBar className="h-4 w-20" />
            </div>
          </div>

          {/* Score cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-surface-border bg-surface-card p-4">
                <SkeletonBar className="h-3 w-16 mb-2" />
                <SkeletonBar className="h-8 w-12 mb-2" />
                <SkeletonBar className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>

          {/* Content sections */}
          <SkeletonBar className="h-5 w-32 mb-4" />
          <div className="rounded-xl border border-surface-border bg-surface-card p-5 mb-6 space-y-3">
            <SkeletonBar className="h-4 w-3/4" />
            <SkeletonBar className="h-4 w-1/2" />
            <SkeletonBar className="h-4 w-2/3" />
          </div>

          <SkeletonBar className="h-5 w-36 mb-4" />
          <div className="rounded-xl border border-surface-border bg-surface-card p-5 mb-6 space-y-3">
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-5/6" />
            <SkeletonBar className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

