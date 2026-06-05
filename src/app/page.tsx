import { Suspense } from "react";
import type { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.llmcompare.cc"),
  title: {
    default: "模型图鉴 - 全球 AI 模型数据一览",
    template: "%s - 模型图鉴",
  },
  description: "收集整理了全球 AI 模型的智能评分、API 速度与官方定价数据，涵盖国内外头部厂商的最新模型，为开发者和研究者提供参考。",
  openGraph: {
    title: "模型图鉴 - 全球 AI 模型数据一览",
    description: "收集整理了全球 AI 模型的智能评分、API 速度与官方定价数据。",
    type: "website",
    locale: "zh_CN",
  },
  verification: {
    google: "Wf7Oa2cKQLQZ6rZkQnzemhakueMXBQtENt5vI6rofa8",
  },
};

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-base" />}>
      <HomeClient />
    </Suspense>
  );
}
