"use client";

import { useSyncExternalStore } from "react";

/**
 * Read URL search params without triggering Next.js client-side
 * route bailout. Replaces `useSearchParams()` from `next/navigation`
 * for read-only consumers that don't need the Next.js Suspense
 * contract.
 *
 * Uses `useSyncExternalStore` so the hook returns the live URL on
 * the client without scheduling a setState in an effect (which
 * triggers cascading-render lint warnings). `popstate` covers
 * back/forward; callers that mutate the URL via `router.replace`
 * should also update their own state synchronously.
 *
 * The cached snapshot is required: `useSyncExternalStore` uses
 * `Object.is` to detect changes, and constructing a fresh
 * URLSearchParams on every call would cause an infinite render loop.
 */

let cachedSearch: string | null = null;
let cachedParams: URLSearchParams | null = null;

function getClientSnapshot(): URLSearchParams {
  const search = window.location.search;
  if (search !== cachedSearch) {
    cachedSearch = search;
    cachedParams = new URLSearchParams(search);
  }
  return cachedParams!;
}

const serverSnapshot = new URLSearchParams();

export function useUrlSearchParams(): URLSearchParams {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("popstate", onChange);
      return () => window.removeEventListener("popstate", onChange);
    },
    getClientSnapshot,
    () => serverSnapshot
  );
}
