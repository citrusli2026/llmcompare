"use client";

import { createContext, use, useCallback, useEffect, useSyncExternalStore } from "react";
import zhMessages from "@/messages/zh.json";
import enMessages from "@/messages/en.json";

type Messages = typeof zhMessages;
type Locale = "zh" | "en";

const messages: Record<Locale, Messages> = {
  zh: zhMessages,
  en: enMessages,
};

const STORAGE_KEY = "llmcompare-locale";
const DEFAULT_LOCALE: Locale = "zh";

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function getClientSnapshot(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {}
  return DEFAULT_LOCALE;
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: "zh",
  setLocale: () => {},
  t: (key: string) => key,
});

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const result = path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
  return typeof result === "string" ? result : undefined;
}

function formatTemplate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  // layout.tsx 的 localeScript 在 SSR 渲染前把非 zh 用户的 <html> 设为 hidden,
  // 避免中文 SSR 内容闪烁; 这里在 hydration 完成后恢复可见
  useEffect(() => {
    document.documentElement.style.visibility = "";
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {}
    // Dispatch storage event so useSyncExternalStore picks up the change
    window.dispatchEvent(new Event("storage"));
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const value = getNestedValue(messages[locale], key);
      if (value === undefined) return key;
      if (params) return formatTemplate(value, params);
      return value;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = use(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return ctx;
}
