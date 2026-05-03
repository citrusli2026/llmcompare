import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product-detail-client";
import { getModelById, getAllModelsUnfiltered } from "@/lib/scoring";

export function generateStaticParams() {
  return getAllModelsUnfiltered().map((model) => ({
    id: model.id,
  }));
}

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const model = getModelById(id);

  if (!model) {
    notFound();
  }

  return <ProductDetailClient model={model} />;
}
