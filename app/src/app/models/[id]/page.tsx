import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetailSkeleton } from "@/components/skeletons";
import { ProductDetailClient } from "@/components/product-detail";
import { getModelById, getAllModels, ModelType } from "@/lib/scoring";

const BASE_URL = "https://www.llmcompare.cc";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const model = getModelById(id);
  if (!model) return { title: "未找到" };
  return {
    title: `${model.name} - ${model.company}`,
    description: `${model.company} ${model.name} 的智能评分、速度性能与定价详情。${model.type === ModelType.Open ? "开源" : "闭源"}模型。`,
    alternates: { canonical: `${BASE_URL}/models/${model.id}` },
  };
}

export function generateStaticParams() {
  return getAllModels().map((model) => ({
    id: model.id,
  }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const model = getModelById(id);

  if (!model) {
    notFound();
  }

  const url = `${BASE_URL}/models/${model.id}`;

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: model.name,
    applicationCategory: "AIApplication",
    operatingSystem: "Web",
    url,
    ...(model.company && { manufacturer: { "@type": "Organization", name: model.company } }),
    ...(model.raw.release_date && { datePublished: model.raw.release_date }),
    ...(model.raw.intelligence != null && model.raw.arena_votes != null && model.raw.arena_votes > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Math.round(model.raw.intelligence * 10) / 10,
        bestRating: 100,
        worstRating: 0,
        ratingCount: model.raw.arena_votes,
      },
    }),
    ...(model.raw.input != null && {
      offers: {
        "@type": "Offer",
        price: model.raw.input,
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: model.raw.input,
          priceCurrency: "USD",
          unitText: "per 1M input tokens",
        },
      },
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: `${BASE_URL}/` },
      { "@type": "ListItem", position: 2, name: "模型目录", item: `${BASE_URL}/models` },
      { "@type": "ListItem", position: 3, name: model.name, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Suspense fallback={<DetailSkeleton />}>
        <ProductDetailClient model={model} />
      </Suspense>
    </>
  );
}
