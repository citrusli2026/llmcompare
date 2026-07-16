import { ImageResponse } from "next/og";
import { getModelById, getAllModels, ModelType } from "@/lib/scoring";

export const alt = "模型图鉴 - 全球 AI 模型智能评分、速度与定价数据";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllModels().map((m) => ({ id: m.id }));
}

const VIOLET = "#7c3aed";
const VIOLET_LIGHT = "#ede9fe";
const TEXT_PRIMARY = "#1a1a2e";
const TEXT_SECONDARY = "#4a4a6a";
const TEXT_MUTED = "#6a6783";
const SURFACE = "#fafafc";
const SURFACE_CARD = "#ffffff";
const BORDER = "#e5e3ee";

function formatScore(v: number | null | undefined): string {
  return v != null ? v.toFixed(1) : "—";
}

function formatContext(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}

function formatPrice(blended: number | null | undefined): string {
  if (blended == null) return "—";
  if (blended === 0) return "Free";
  return `$${blended.toFixed(2)}/M`;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const model = getModelById(id);

  if (!model) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: SURFACE,
          fontSize: 64,
          color: TEXT_PRIMARY,
        }}
      >
        LLMCompare
      </div>,
      size,
    );
  }

  const intelligence = model.raw.intelligence;
  const coding = model.raw.coding;
  const agentic = model.raw.agentic;
  const releaseDate = model.raw.release_date;
  const isOpen = model.type === ModelType.Open;
  const context = model.raw.context_window;
  const blended = model.raw.blended;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: SURFACE,
          padding: 60,
          fontFamily: "sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: VIOLET,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            L
          </div>
          <div style={{ display: "flex", fontSize: 22, color: TEXT_MUTED, letterSpacing: 1 }}>
            LLMCompare · 模型图鉴
          </div>
        </div>

        {/* Main card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: SURFACE_CARD,
            borderRadius: 24,
            border: `1px solid ${BORDER}`,
            padding: 48,
            flex: 1,
          }}
        >
          {/* Company + badge row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 24, color: TEXT_SECONDARY }}>{model.company}</div>
            <div
              style={{
                display: "flex",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 600,
                backgroundColor: isOpen ? VIOLET_LIGHT : "#e0f2fe",
                color: isOpen ? VIOLET : "#0369a1",
              }}
            >
              {isOpen ? "开源" : "闭源"}
            </div>
            {releaseDate && (
              <div style={{ display: "flex", fontSize: 18, color: TEXT_MUTED }}>{releaseDate}</div>
            )}
          </div>

          {/* Model name */}
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 800,
              color: TEXT_PRIMARY,
              lineHeight: 1.1,
              marginBottom: 36,
              letterSpacing: -1.5,
            }}
          >
            {model.name}
          </div>

          {/* Metric grid — 2x2 */}
          <div style={{ display: "flex", gap: 16, marginTop: "auto" }}>
            <MetricCell label="智能分" value={formatScore(intelligence)} accent />
            <MetricCell label="编程" value={formatScore(coding)} />
            <MetricCell label="Agent" value={formatScore(agentic)} />
            <MetricCell label="混合价" value={formatPrice(blended)} />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 24,
            fontSize: 20,
            color: TEXT_MUTED,
          }}
        >
          <div style={{ display: "flex" }}>上下文 {formatContext(context)}</div>
          <div style={{ display: "flex" }}>llmcompare.cc</div>
        </div>
      </div>
    ),
    size,
  );
}

function MetricCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: accent ? VIOLET_LIGHT : SURFACE,
        borderRadius: 16,
        padding: 20,
        border: `1px solid ${accent ? VIOLET : BORDER}`,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 16,
          color: TEXT_SECONDARY,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 38,
          fontWeight: 700,
          color: accent ? VIOLET : TEXT_PRIMARY,
        }}
      >
        {value}
      </div>
    </div>
  );
}
