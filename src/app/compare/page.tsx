import { Suspense } from "react";
import type { Metadata } from "next";
import { ComparePageClient } from "./compare-client";

export const metadata: Metadata = {
  title: "模型对比",
};

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <ComparePageClient />
    </Suspense>
  );
}
