import type { Metadata } from "next";
import AboutPageClient from "./about-page-client";

export const metadata: Metadata = {
  title: "关于 - 模型图鉴的数据来源与收录标准",
  description:
    "模型图鉴的数据来源、收录标准、字段说明与免责声明。基于 Artificial Analysis、OpenRouter 与 Arena 的公开数据，聚焦大语言模型的智能评分、API 性能与定价信息。",
  keywords: ["模型图鉴", "数据来源", "收录标准", "Artificial Analysis", "OpenRouter", "Arena", "模型排名方法"],
  alternates: { canonical: "https://www.llmcompare.cc/about" },
  openGraph: {
    title: "关于 - 模型图鉴的数据来源与收录标准",
    description: "模型图鉴的数据来源、收录标准、字段说明与免责声明。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "关于 - 模型图鉴的数据来源与收录标准",
    description: "模型图鉴的数据来源、收录标准、字段说明与免责声明。",
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
