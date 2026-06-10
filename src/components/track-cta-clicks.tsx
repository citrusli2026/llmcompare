"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

/**
 * Global click delegator for CTA analytics.
 *
 * Listens for clicks anywhere in the document and emits a `cta_click`
 * event to Vercel Web Analytics for any element (or its ancestor) carrying
 * a `data-cta` attribute. This avoids sprinkling `onClick` handlers across
 * every component while keeping a single, well-typed ingestion path.
 */
export function TrackCtaClicks() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || typeof target.closest !== "function") return;

      const ctaEl = target.closest<HTMLElement>("[data-cta]");
      if (!ctaEl) return;

      const cta = ctaEl.getAttribute("data-cta");
      if (!cta) return;

      // Pull common context — model id, link target, page path.
      const closestModel = ctaEl.closest<HTMLElement>("[data-model-id]");
      const modelId = closestModel?.getAttribute("data-model-id")
        ?? ctaEl.getAttribute("data-model-id")
        ?? undefined;

      const href = (ctaEl as HTMLAnchorElement).href
        || ctaEl.getAttribute("data-cta-href")
        || undefined;

      track("cta_click", {
        cta,
        model_id: modelId,
        href: href ? new URL(href, window.location.href).toString() : undefined,
        path: window.location.pathname,
        favorite_state: ctaEl.getAttribute("data-favorite") ?? undefined,
      });
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return null;
}
