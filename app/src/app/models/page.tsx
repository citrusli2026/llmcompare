import type { Metadata } from "next";
import { Suspense } from "react";
import ModelsPageClient from "./models-page-client";
import { ModelsSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "模型目录 - 全球 AI 模型智能评分与定价对比",
  description:
    "全球 AI 模型智能评分、API 速度与官方定价对比。涵盖 DeepSeek、Kimi、Qwen、Claude、GPT、Gemini 等主流模型的基准测试数据，帮助开发者快速选型。",
  keywords: ["模型目录", "AI 模型对比", "LLM 排名", "DeepSeek", "Kimi", "Qwen", "Claude", "GPT", "Gemini", "API 定价"],
  alternates: { canonical: "https://www.llmcompare.cc/models" },
  openGraph: {
    title: "模型目录 - 全球 AI 模型智能评分与定价对比",
    description: "全球 AI 模型智能评分、API 速度与官方定价对比。涵盖主流模型的基准测试数据。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "模型目录 - 全球 AI 模型智能评分与定价对比",
    description: "全球 AI 模型智能评分、API 速度与官方定价对比。涵盖主流模型的基准测试数据。",
  },
};

export default function ModelsPage() {
  return (
    <Suspense fallback={<ModelsSkeleton />}>
      <ModelsPageClient />
    </Suspense>
  );
}
