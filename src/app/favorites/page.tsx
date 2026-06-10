import type { Metadata } from "next";
import { Suspense } from "react";
import FavoritesPageClient from "./favorites-page-client";
import { ModelsSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "我的收藏",
  description: "本地保存的 AI 模型收藏清单。在任何设备上访问 llmcompare.cc 都可以查看。",
  alternates: { canonical: "https://www.llmcompare.cc/favorites" },
};

export default function FavoritesPage() {
  return (
    <Suspense fallback={<ModelsSkeleton />}>
      <FavoritesPageClient />
    </Suspense>
  );
}
