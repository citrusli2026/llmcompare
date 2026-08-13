import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetailSkeleton } from "@/components/skeletons";
import { ProductDetailClient } from "@/components/product-detail";
import { getModelById, getAllModels, ModelType } from "@/lib/scoring";
import { safeJsonLd } from "@/lib/utils";

const BASE_URL = "https://www.llmcompare.cc";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const model = getModelById(id);
  if (!model) return { title: "未找到" };
  const typeLabel = model.type === ModelType.Open ? "开源" : "闭源";
  const intel = model.raw.intelligence != null ? `智能分 ${Math.round(model.raw.intelligence * 10) / 10}` : "";
  const price = model.raw.input != null ? `输入 $${model.raw.input}/M tokens` : "";
  const metaParts = [intel, price].filter(Boolean).join(" · ");
  const description = `${model.company} ${model.name} 的${metaParts ? `${metaParts}。` : "智能评分、速度性能与定价详情。"}${typeLabel}模型。查看 benchmarks、速度、定价与同类推荐。`;
  const url = `${BASE_URL}/models/${model.id}`;
  const keywords = [
    model.name,
    model.company,
    `${model.name} 评测`,
    `${model.name} 定价`,
    `${model.name} API`,
    typeLabel === "开源" ? "开源模型" : "闭源模型",
    "LLM",
    "AI 模型",
  ];
  return {
    title: `${model.name} - ${model.company} | 智能评分与定价`,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${model.name} - ${model.company}`,
      description,
      url,
      type: "website",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${model.name} - ${model.company}`,
      description,
    },
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
        dangerouslySetInnerHTML={{ __html: safeJsonLd(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      <Suspense fallback={<DetailSkeleton />}>
        <ProductDetailClient model={model} />
      </Suspense>
    </>
  );
}
