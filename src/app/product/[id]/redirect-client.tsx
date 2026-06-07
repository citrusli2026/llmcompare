"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export function OldProductRedirectClient() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/models/${params.id}`);
  }, [params.id, router]);

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center">
      <p className="text-text-muted text-sm">正在跳转…</p>
    </div>
  );
}
