"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { SceneSelector } from "@/components/scene-selector";
import { useTranslation } from "@/lib/i18n";

export default function HomeClient() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      {/* Hero Section — Selection Assistant Entry Point */}
      <section
        className="relative overflow-hidden px-4 pt-10 sm:pt-16 lg:px-8"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(106,95,193,0.15) 0%, transparent 60%)",
        }}
      >
        <div className="mx-auto max-w-5xl text-center relative z-10">
          <Link href="/models" className="hidden sm:inline-block">
            <Badge
              variant="secondary"
              className="mb-4 bg-accent-lime/10 text-accent-lime hover:bg-accent-lime/20 border-accent-lime/20 cursor-pointer"
            >
              <TrendingUp className="mr-1 h-3 w-3" />
              {t("home.badge")}
            </Badge>
          </Link>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-text-primary">
            {t("home.heroTitle")}
          </h1>

          <p className="mt-3 text-sm sm:text-base md:text-lg text-text-secondary max-w-2xl mx-auto">
            {t("home.heroDesc")}
          </p>

          {/* Primary CTA — Start Selection */}
          <div className="mt-6 flex justify-center">
            <Link
              href="/models"
              className="inline-flex items-center gap-2 rounded-full bg-accent-violet px-6 py-3 text-sm font-semibold text-white hover:bg-violet-600 transition-all shadow-lg shadow-accent-violet/20 hover:shadow-xl hover:shadow-accent-violet/30 hover:-translate-y-0.5 active:scale-95"
            >
              {t("home.startSelection")}
            </Link>
          </div>
        </div>

        {/* Scene Selection Cards — inline in hero */}
        <SceneSelector hideHeader />
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border bg-surface-elevated px-4 py-8 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-7xl text-center text-sm text-text-muted">
          <p>{t("home.footer")}</p>
          <p className="mt-1">{t("home.footerDisclaimer")}</p>
        </div>
      </footer>
    </div>
  );
}
