import { Suspense } from "react";
import type { Metadata } from "next";
import HomeClient from "./home-client";
import { HomeSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "AI 模型选型助手 - 选对模型，事半功倍",
  description: "60+ 全球 AI 模型 — 根据你的使用场景推荐最合适的模型。智能评分、速度、定价全方位对比，帮你从编程、Agent、性价比等角度找到最佳选择。",
  keywords: ["AI 模型", "大模型选型", "LLM 对比", "模型排名", "API 定价", "OpenAI", "Claude", "DeepSeek", "Kimi", "Qwen"],
  alternates: { canonical: "https://www.llmcompare.cc/" },
  openGraph: {
    title: "AI 模型选型助手 - 选对模型，事半功倍",
    description: "60+ 全球 AI 模型 — 根据你的使用场景推荐最合适的模型。智能评分、速度、定价全方位对比。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 模型选型助手 - 选对模型，事半功倍",
    description: "60+ 全球 AI 模型 — 根据你的使用场景推荐最合适的模型。智能评分、速度、定价全方位对比。",
  },
};

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeClient />
    </Suspense>
  );
}
