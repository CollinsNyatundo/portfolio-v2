/**
 * Shared layout for social preview images (next/og). Paper ground, ink type,
 * one accent rule: the site's tokens (docs/04 §4), no gradients (04 §10).
 */
import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const PAPER = "#F3F4F1";
const INK = "#14181A";
const MUTED = "#4E5A55";
const ACCENT = "#1E6B52";

export function ogImage({
  eyebrow,
  title,
  body,
  figure,
  source,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  /** A figure always travels with its context (AGENTS.md rule 1). */
  figure?: { value: string; label: string; context: string };
  /** Where the figure comes from: a readable URL, or "Private work". */
  source?: string;
}) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: PAPER,
        color: INK,
        padding: "72px 80px",
        fontFamily: "serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: ACCENT,
            fontFamily: "sans-serif",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 48 ? 60 : 72,
            lineHeight: 1.08,
            marginTop: 28,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        {body && (
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: 1.35,
              color: MUTED,
              marginTop: 28,
              maxWidth: 980,
            }}
          >
            {body}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderTop: `3px solid ${ACCENT}`,
          paddingTop: 28,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>
            {site.name}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
            {site.title} · {site.location}
          </div>
        </div>
        {figure && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              maxWidth: 460,
            }}
          >
            <div style={{ display: "flex", fontSize: 54, fontWeight: 700 }}>
              {figure.value}
            </div>
            <div style={{ display: "flex", fontSize: 22 }}>{figure.label}</div>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                color: MUTED,
                textAlign: "right",
              }}
            >
              {figure.context}
            </div>
            {source && (
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  color: ACCENT,
                  marginTop: 6,
                }}
              >
                {source}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    ogSize,
  );
}
