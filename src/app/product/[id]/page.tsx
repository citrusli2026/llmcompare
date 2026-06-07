import { getAllModelsUnfiltered } from "@/lib/scoring";
import { OldProductRedirectClient } from "./redirect-client";

export function generateStaticParams() {
  return getAllModelsUnfiltered().map((model) => ({
    id: model.id,
  }));
}

export default function OldProductRedirectPage() {
  return <OldProductRedirectClient />;
}
