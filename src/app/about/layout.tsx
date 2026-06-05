import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于",
  description: "模型图鉴是由 AI 爱好者维护的开源数据项目，收集整理大语言模型的公开数据。",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
