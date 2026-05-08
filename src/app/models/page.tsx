import type { Metadata } from "next";
import { Suspense } from "react";
import ModelsPageClient from "./models-page-client";

export const metadata: Metadata = {
  title: "模型目录",
  description:
    "国内大模型智能评分、API 速度与官方定价对比。涵盖 DeepSeek、Kimi、Qwen、通义千问、GLM、MiniMax 等 30+ 主流模型的基准测试数据，帮助开发者快速选型。",
  alternates: { canonical: "https://www.llmcompare.cc/models" },
};

export default function ModelsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-base" />}>
      <ModelsPageClient />
    </Suspense>
  );
}
