import ComparePageClient from "./compare-page-client";
import { getAllModelsUnfiltered } from "@/lib/scoring";

export default function ComparePage() {
  const models = getAllModelsUnfiltered();
  return <ComparePageClient models={models} />;
}
