"use client";

import { useMemo } from "react";
import { Bot, Trophy, Sparkles, Calendar } from "lucide-react";
import { getAllModels } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

export function StatsStrip() {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const all = getAllModels();
    const total = all.length;

    const topModel = all.reduce((best, m) => {
      const score = m.raw.intelligence ?? -Infinity;
      return score > best.score ? { name: m.name, score } : best;
    }, { name: "—", score: -Infinity });

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const newThisMonth = all.filter((m) => {
      if (!m.raw.release_date) return false;
      const d = new Date(m.raw.release_date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    return {
      total,
      topScore: topModel.score > -Infinity ? topModel.score : null,
      topName: topModel.name,
      newThisMonth,
    };
  }, []);

  const cards = [
    {
      icon: Bot,
      label: t("home.statsModels"),
      value: stats.total,
      sub: t("home.statsActive"),
    },
    {
      icon: Trophy,
      label: t("home.statsTopScore"),
      value: stats.topScore != null ? stats.topScore.toFixed(1) : "—",
      sub: stats.topName,
    },
    {
      icon: Sparkles,
      label: t("home.statsNewModels"),
      value: stats.newThisMonth,
      sub: t("home.statsNewCount", { n: stats.newThisMonth }),
    },
    {
      icon: Calendar,
      label: t("home.statsUpdated"),
      value: t("home.statsUpdatedValue"),
      sub: t("home.statsUpdatedDesc"),
    },
  ];

  return (
    <section className="px-4 pt-2 pb-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-surface-border bg-surface-card p-4 flex items-start gap-3 transition-all hover:bg-surface-hover"
              style={{ boxShadow: "rgba(0,0,0,0.06) 0px 10px 15px -3px" }}
            >
              <div className="mt-0.5 shrink-0 rounded-lg bg-accent-violet/15 p-2 text-accent-violet">
                <card.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-text-muted uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-text-primary tabular-nums mt-0.5">{card.value}</p>
                <p className="text-[11px] text-text-secondary truncate">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
