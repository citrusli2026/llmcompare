import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailSkeleton } from "@/components/skeletons";
import { ComparePageClient } from "./compare-client";

export const metadata: Metadata = {
  title: "模型对比",
  description: "并排对比 AI 模型的智能评分、速度、定价与关键参数，快速找到最适合的模型。",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ComparePageClient />
    </Suspense>
  );
}
