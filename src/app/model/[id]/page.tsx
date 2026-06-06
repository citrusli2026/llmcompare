import { getAllModelsUnfiltered } from "@/lib/scoring";
import { ModelRedirectClient } from "./client";

export function generateStaticParams() {
  return getAllModelsUnfiltered().map((model) => ({
    id: model.id,
  }));
}

export default function ModelRedirectPage() {
  return <ModelRedirectClient />;
}
