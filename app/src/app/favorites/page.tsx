import type { Metadata } from "next";
import { Suspense } from "react";
import FavoritesPageClient from "./favorites-page-client";
import { ModelsSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "我的收藏",
  description:
    "保存在本机浏览器中的 AI 模型收藏清单，可生成链接分享给他人或导入到其他设备。Favorites are stored locally in your browser — share them via a link or import them on another device.",
  alternates: { canonical: "https://www.llmcompare.cc/favorites" },
  robots: { index: false },
};

export default function FavoritesPage() {
  return (
    <Suspense fallback={<ModelsSkeleton />}>
      <FavoritesPageClient />
    </Suspense>
  );
}
