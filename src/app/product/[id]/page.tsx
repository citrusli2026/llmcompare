import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product-detail-client";
import { getModelById, getAllModelsUnfiltered } from "@/lib/scoring";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const model = getModelById(id);
  if (!model) return { title: "未找到" };
  return {
    title: `${model.name} - ${model.company}`,
    description: `${model.company} ${model.name} 的智能评分、速度性能与定价详情。${model.type === "开源" ? "开源" : "闭源"}模型。`,
  };
}

export function generateStaticParams() {
  return getAllModelsUnfiltered().map((model) => ({
    id: model.id,
  }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const model = getModelById(id);

  if (!model) {
    notFound();
  }

  return <ProductDetailClient model={model} />;
}
