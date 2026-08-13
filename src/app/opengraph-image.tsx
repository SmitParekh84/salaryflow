import { BRAND } from "@/lib/brand";
import { ImageResponse } from "next/og";

/**
 * The social preview card, generated at build time rather than checked in as a
 * PNG. Keeping it as code means the brandline can never drift from
 * src/lib/brand.ts the way an exported image would.
 *
 * Rendered by Satori, which supports a deliberately small slice of CSS: flex
 * only (no grid), no CSS variables, and every element with more than one child
 * needs an explicit `display: flex`.
 */
export const runtime = "nodejs";
export const alt = `${BRAND.name} — ${BRAND.brandline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#071f32",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* A single soft bloom, echoing the hero glow on the landing page. */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -160,
            width: 640,
            height: 640,
            borderRadius: 640,
            background: "radial-gradient(circle, rgba(0,207,209,0.28), rgba(0,207,209,0))",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #00cfd1, #6ee7b7)",
            }}
          />
          <div style={{ color: "#fff", fontSize: 38, fontWeight: 700, letterSpacing: -0.5 }}>
            {BRAND.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#fff",
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Know what you can safely spend today.
          </div>
          <div
            style={{
              color: "#9fc4d6",
              fontSize: 30,
              lineHeight: 1.4,
              marginTop: 28,
              maxWidth: 820,
            }}
          >
            One calm daily number, paced to your next payday.
          </div>
        </div>

        <div style={{ display: "flex", color: "#6ee7b7", fontSize: 26, fontWeight: 600 }}>
          {BRAND.domain}
        </div>
      </div>
    ),
    size,
  );
}
