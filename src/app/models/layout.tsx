import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "模型目录",
  description: "浏览全部国内大模型，按智能、编程、Agent、速度、成本多维度排序筛选。",
};

export default function ModelsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
