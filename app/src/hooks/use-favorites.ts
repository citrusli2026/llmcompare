"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "llmcompare-favorites";

let cachedRaw: string | null | undefined = undefined;

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
    return [];
  } catch {
    return [];
  }
}

function writeStorage(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // quota / private mode — silently ignore
  }
}

const subscribe = (onChange: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener("llmcompare-favorites-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("llmcompare-favorites-change", onChange);
  };
};

const getSnapshot = (): string => {
  const raw = readStorage().join(",");
  if (raw !== cachedRaw) {
    cachedRaw = raw;
  }
  return cachedRaw!;
};

const getServerSnapshot = (): string => "";

/**
 * Subscribe to the favorites set stored in localStorage.
 * Cross-tab sync via the native `storage` event; same-tab updates
 * dispatched through a custom event so the in-page UI reacts.
 */
function useFavoritesIds(): string[] {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return snapshot === "" ? [] : snapshot.split(",");
}

export function useFavorites() {
  const favorites = useFavoritesIds();

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      const next = favorites.includes(id)
        ? favorites.filter((x) => x !== id)
        : [...favorites, id];
      writeStorage(next);
      window.dispatchEvent(new Event("llmcompare-favorites-change"));
    },
    [favorites],
  );

  const clearFavorites = useCallback(() => {
    writeStorage([]);
    window.dispatchEvent(new Event("llmcompare-favorites-change"));
  }, []);

  /** 合并外部 id 列表（如分享的收藏链接导入），去重并追加在末尾 */
  const mergeFavorites = useCallback(
    (ids: string[]) => {
      const next = [...favorites];
      for (const id of ids) {
        if (!next.includes(id)) next.push(id);
      }
      writeStorage(next);
      window.dispatchEvent(new Event("llmcompare-favorites-change"));
    },
    [favorites],
  );

  return { favorites, isFavorite, toggleFavorite, clearFavorites, mergeFavorites };
}
