import type { Metadata } from "next";
import { Suspense } from "react";
import ModelsPageClient from "./models-page-client";
import { ModelsSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "模型目录",
  description:
    "全球 AI 模型智能评分、API 速度与官方定价对比。涵盖 DeepSeek、Kimi、Qwen、Claude、GPT、Gemini 等主流模型的基准测试数据，帮助开发者快速选型。",
  alternates: { canonical: "https://www.llmcompare.cc/models" },
};

export default function ModelsPage() {
  return (
    <Suspense fallback={<ModelsSkeleton />}>
      <ModelsPageClient />
    </Suspense>
  );
}
