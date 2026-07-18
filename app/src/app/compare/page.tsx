import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailSkeleton } from "@/components/skeletons";
import { ComparePageClient } from "./compare-client";

export const metadata: Metadata = {
  title: "模型对比 - 并排比较 AI 模型智能、速度与价格",
  description: "并排对比多个 AI 模型的智能评分、API 速度、官方定价与关键参数，快速找到最适合业务场景的模型。",
  keywords: ["模型对比", "AI 模型比较", "LLM 选型", "智能评分对比", "API 定价对比"],
  alternates: { canonical: "https://www.llmcompare.cc/compare" },
  openGraph: {
    title: "模型对比 - 并排比较 AI 模型智能、速度与价格",
    description: "并排对比多个 AI 模型的智能评分、API 速度、官方定价与关键参数。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "模型对比 - 并排比较 AI 模型智能、速度与价格",
    description: "并排对比多个 AI 模型的智能评分、API 速度、官方定价与关键参数。",
  },
};

export default function ComparePage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ComparePageClient />
    </Suspense>
  );
}
