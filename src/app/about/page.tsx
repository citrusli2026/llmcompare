import type { Metadata } from "next";
import AboutPageClient from "./about-page-client";

export const metadata: Metadata = {
  title: "关于",
  description:
    "模型图鉴的数据来源、筛选标准与免责声明。基于 Artificial Analysis 和 OpenRouter 的公开数据，聚焦国内大语言模型的智能评分、API 性能与定价信息。",
  alternates: { canonical: "https://www.llmcompare.cc/about" },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
