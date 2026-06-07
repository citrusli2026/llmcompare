import { Suspense } from "react";
import type { Metadata } from "next";
import { ComparePageClient } from "./compare-client";
import { CompareSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "模型对比",
};

export default function ComparePage() {
  return (
    <Suspense fallback={<CompareSkeleton />}>
      <ComparePageClient />
    </Suspense>
  );
}
