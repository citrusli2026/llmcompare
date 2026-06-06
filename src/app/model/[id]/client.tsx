"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export function ModelRedirectClient() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/product/${params.id}`);
  }, [params.id, router]);

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center">
      <p className="text-text-muted text-sm">Redirecting...</p>
    </div>
  );
}
