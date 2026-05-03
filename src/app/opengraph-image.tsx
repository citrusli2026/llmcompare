import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1e1b4b",
          backgroundImage: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, color: "#e0e7ff" }}>
          模型图鉴
        </div>
        <div style={{ marginTop: 16, fontSize: 28, color: "#a5b4fc" }}>
          国内大模型数据一览
        </div>
      </div>
    ),
    { ...size },
  );
}
