import { Suspense } from "react";
import type { Metadata } from "next";
import HomeClient from "./home-client";
import { HomeSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.llmcompare.cc"),
  title: {
    default: "AI 模型选型助手 - 选对模型，事半功倍",
    template: "%s - AI 模型选型",
  },
  description: "60+ 全球 AI 模型 — 根据你的使用场景推荐最合适的模型。智能评分、速度、定价全方位对比，帮你从编程、Agent、性价比等角度找到最佳选择。",
  openGraph: {
    title: "AI 模型选型助手 - 选对模型，事半功倍",
    description: "60+ 全球 AI 模型 — 根据你的使用场景推荐最合适的模型。智能评分、速度、定价全方位对比。",
    type: "website",
    locale: "zh_CN",
  },
  verification: {
    google: "Wf7Oa2cKQLQZ6rZkQnzemhakueMXBQtENt5vI6rofa8",
  },
};

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeClient />
    </Suspense>
  );
}
