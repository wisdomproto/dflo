// Overlay component library for the Thai localization of the clinic process video.
// The clean source video (no text) is the background; these recreate the Korean
// on-screen graphics in Thai, matching size / color / effect as closely as possible.
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { NOTO_SANS_THAI } from "../lib/fonts";

// ---- shared timing helpers --------------------------------------------------
function useEnter(durIn = 7) {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, durIn], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// pop = scale spring + fade, used for graphic titles / chips
function usePop(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
  const opacity = interpolate(frame - delay, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { scale: 0.6 + 0.4 * s, opacity };
}

// =============================================================================
// 1) Bottom subtitle — white or cream, optional per-word emphasis.
// =============================================================================
export type SubSeg = { t: string; em?: boolean };

export const Subtitle: React.FC<{
  lines: SubSeg[][];
  tone?: "white" | "cream";
}> = ({ lines, tone = "white" }) => {
  const o = useEnter(6);
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 6], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const base = tone === "cream" ? "#FCE7A6" : "#ffffff";
  const emColor = tone === "cream" ? "#fff6df" : "#FFE45E";
  return (
    <div
      style={{
        position: "absolute",
        bottom: 64,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: o,
        transform: `translateY(${y}px)`,
        fontFamily: NOTO_SANS_THAI,
        padding: "0 120px",
      }}
    >
      {lines.map((segs, i) => (
        <div
          key={i}
          style={{
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.32,
            letterSpacing: 0.2,
            textShadow:
              "0 2px 8px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.9)",
          }}
        >
          {segs.map((s, j) => (
            <span
              key={j}
              style={{
                color: s.em ? emColor : base,
                fontWeight: s.em ? 900 : 700,
              }}
            >
              {s.t}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// 2) Center title — two-part: outlined accent word + solid bold word.
//    e.g. KR "균형있는"(white + magenta stroke) + "건강한 성장"(solid white).
// =============================================================================
export type TitlePart = { t: string; style: "outline" | "solid" };

export const CenterTitle: React.FC<{
  parts: TitlePart[];
  fontSize?: number;
  y?: number; // vertical center as % of height
  stroke?: string;
}> = ({ parts, fontSize = 88, y = 44, stroke = "#C026D3" }) => {
  const { scale, opacity } = usePop(0);
  return (
    <div
      style={{
        position: "absolute",
        top: `${y}%`,
        left: 0,
        right: 0,
        transform: `translateY(-50%) scale(${scale})`,
        opacity,
        textAlign: "center",
        fontFamily: NOTO_SANS_THAI,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        gap: 18,
        padding: "0 80px",
      }}
    >
      {parts.map((p, i) => (
        <span
          key={i}
          style={
            p.style === "outline"
              ? {
                  fontSize: fontSize * 0.82,
                  fontWeight: 900,
                  color: "#ffffff",
                  WebkitTextStroke: `7px ${stroke}`,
                  paintOrder: "stroke fill",
                  textShadow: "0 4px 18px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.5)",
                }
              : {
                  fontSize,
                  fontWeight: 900,
                  color: "#ffffff",
                  textShadow:
                    "0 4px 18px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.6)",
                }
          }
        >
          {p.t}
        </span>
      ))}
    </div>
  );
};

// =============================================================================
// 3) Top-right brand watermark (English 187 GROWUP wordmark).
// =============================================================================
export const Watermark: React.FC<{ width?: number }> = ({ width = 220 }) => {
  const o = useEnter(10);
  return (
    <Img
      src={staticFile("images/logo_187growup.png")}
      style={{
        position: "absolute",
        top: 34,
        right: 44,
        width,
        height: "auto",
        opacity: o * 0.92,
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.25))",
      }}
    />
  );
};

// =============================================================================
// 4) Top-left category chip (dark rounded box).
// =============================================================================
export const CategoryChip: React.FC<{ text: string }> = ({ text }) => {
  const { scale, opacity } = usePop(0);
  return (
    <div
      style={{
        position: "absolute",
        top: 34,
        left: 44,
        transform: `scale(${scale})`,
        transformOrigin: "left top",
        opacity,
        background: "rgba(40,38,46,0.82)",
        color: "#fff",
        fontFamily: NOTO_SANS_THAI,
        fontSize: 30,
        fontWeight: 700,
        padding: "10px 22px",
        borderRadius: 12,
        letterSpacing: 0.3,
      }}
    >
      {text}
    </div>
  );
};

// =============================================================================
// 5) Keyword label — TEXT ONLY. The translucent circle is already baked into
//    the source footage (and moves / changes per shot), so we never draw our
//    own bubble (that would create a duplicate). We just place the Thai text on
//    top of the baked bubble; it fades in a few frames after the cue starts so
//    the bubble reads first.
// =============================================================================
export const CircleKeyword: React.FC<{
  text: string;
  xPct: number;
  yPct: number;
  fontSize?: number;
  delay?: number; // frames before text fades in (lets the baked bubble lead)
}> = ({ text, xPct, yPct, fontSize = 32, delay = 5 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame - delay, [0, 6], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: `translate(-50%, -50%) translateY(${y}px)`,
        opacity,
        width: 220,
        textAlign: "center",
        color: "#ffffff",
        fontFamily: NOTO_SANS_THAI,
        fontSize,
        fontWeight: 800,
        lineHeight: 1.12,
        textShadow: "0 2px 10px rgba(0,0,0,0.55), 0 0 3px rgba(0,0,0,0.6)",
      }}
    >
      {text}
    </div>
  );
};

// =============================================================================
// 5b) Positioned label — arbitrary placed text with a pop-in (e.g. step titles
//     on the right, next to the big section number). Supports one emphasized
//     trailing accent via `accent`.
// =============================================================================
export const PosLabel: React.FC<{
  text: string;
  xPct: number;
  yPct: number;
  fontSize?: number;
  align?: "left" | "center" | "right";
  color?: string;
  outline?: string; // text stroke color (e.g. gold for grid labels)
  width?: number; // if set, allow wrapping within this px width
}> = ({ text, xPct, yPct, fontSize = 40, align = "center", color = "#ffffff", outline, width }) => {
  const { scale, opacity } = usePop(0);
  const x = interpolate(scale, [0.6, 1], [16, 0]); // slight slide as it pops
  const originX = align === "right" ? "right" : align === "left" ? "left" : "center";
  return (
    <div
      style={{
        position: "absolute",
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: `translate(-50%, -50%) translateX(${x}px) scale(${scale})`,
        transformOrigin: `${originX} center`,
        opacity,
        color,
        fontFamily: NOTO_SANS_THAI,
        fontSize,
        fontWeight: 900,
        textAlign: align,
        lineHeight: 1.15,
        ...(width ? { width, whiteSpace: "normal" as const } : { whiteSpace: "nowrap" as const }),
        ...(outline
          ? {
              WebkitTextStroke: `2.5px ${outline}`,
              paintOrder: "stroke fill" as const,
              textShadow: "0 3px 12px rgba(0,0,0,0.45)",
            }
          : { textShadow: "0 3px 14px rgba(0,0,0,0.5), 0 0 2px rgba(0,0,0,0.55)" }),
      }}
    >
      {text}
    </div>
  );
};

// =============================================================================
// 5c) Callout — a small eyebrow line above a big value line (e.g. the
//     boy/girl age-range labels, or a bottom-left emphasis title).
// =============================================================================
export const Callout: React.FC<{
  top: string;
  bottom: string;
  xPct: number;
  yPct: number;
  align?: "left" | "center" | "right";
  bottomSize?: number;
  topSize?: number;
  color?: string;
  banner?: boolean; // opaque rounded panel behind text (to cover baked text)
  bannerW?: number; // explicit cover width (px) — sized to hide baked text
  bannerH?: number; // explicit cover height (px)
  bannerBg?: string; // banner background color (match the baked banner tone)
  bannerTextColor?: string; // text color on banner (default dark navy; e.g. gold for floor signage)
}> = ({ top, bottom, xPct, yPct, align = "center", bottomSize = 48, topSize, color = "#ffffff", banner = false, bannerW, bannerH, bannerBg, bannerTextColor }) => {
  const pop = usePop(0);
  // A cover banner must hide the baked text INSTANTLY (no fade/scale) or the
  // Korean underneath peeks through during the animation.
  const scale = banner ? 1 : pop.scale;
  const opacity = banner ? 1 : pop.opacity;
  const ts = topSize ?? Math.round(bottomSize * 0.62);
  const ax = banner ? "center" : align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  const bannerColor = banner ? (bannerTextColor ?? "#27304d") : color; // dark text on light panel (override for dark signage)
  return (
    <div
      style={{
        position: "absolute",
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center",
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: ax,
        justifyContent: "center",
        fontFamily: NOTO_SANS_THAI,
        color: bannerColor,
        textAlign: banner ? "center" : align,
        ...(banner
          ? {
              background: bannerBg ?? "rgb(248,246,240)",
              borderRadius: 18,
              width: bannerW,
              height: bannerH,
              boxShadow: "0 6px 22px rgba(0,0,0,0.22)",
            }
          : {
              textShadow: "0 3px 14px rgba(0,0,0,0.6), 0 0 3px rgba(0,0,0,0.6)",
            }),
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: ts, fontWeight: 600, opacity: banner ? 0.85 : 0.92, marginBottom: 2 }}>{top}</span>
      <span style={{ fontSize: bottomSize, fontWeight: 900, lineHeight: 1.05 }}>{bottom}</span>
    </div>
  );
};

// =============================================================================
// 6) Big translucent section number (01 / 02 / 03 ...).
// =============================================================================
export const SectionNumber: React.FC<{
  value: string;
  xPct?: number;
  yPct?: number;
  size?: number;
}> = ({ value, xPct = 78, yPct = 64, size = 200 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 10], [0, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = interpolate(frame, [0, 12], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: `translate(-50%, -50%) translateX(${x}px)`,
        opacity: o,
        color: "#ffffff",
        fontFamily: NOTO_SANS_THAI,
        fontSize: size,
        fontWeight: 900,
        fontStyle: "italic",
        letterSpacing: -4,
        textShadow: "0 6px 24px rgba(0,0,0,0.35)",
      }}
    >
      {value}
    </div>
  );
};

// =============================================================================
// 7) Q. question card (Q&A section opener) — left-aligned, multi-line, big.
//    Dark text by default (sits over a light b-roll shot, like the signboard).
// =============================================================================
export const QCard: React.FC<{
  lines: { t: string; strong?: boolean }[];
  color?: string;
}> = ({ lines, color = "#27304d" }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = interpolate(frame, [0, 12], [-30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // 배경 대비 보강: 흰 텍스트(어두운 b-roll)엔 검은 그림자, 다크네이비(밝은/회색 b-roll)엔 흰 글로우.
  const lc = color.toLowerCase();
  const isLight = lc === "#ffffff" || lc === "#fff" || lc === "white";
  const textShadow = isLight
    ? "0 2px 12px rgba(0,0,0,0.6), 0 0 3px rgba(0,0,0,0.55)"
    : "0 0 16px rgba(255,255,255,0.75), 0 1px 3px rgba(255,255,255,0.65)";
  return (
    <div
      style={{
        position: "absolute",
        left: "9%",
        top: "50%",
        transform: `translateY(-50%) translateX(${x}px)`,
        opacity,
        fontFamily: NOTO_SANS_THAI,
        color,
        textShadow,
        textAlign: "left",
      }}
    >
      <div style={{ fontSize: 110, fontWeight: 900, lineHeight: 1, marginBottom: 12 }}>
        Q.
      </div>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontSize: l.strong ? 64 : 44,
            fontWeight: l.strong ? 900 : 600,
            lineHeight: 1.25,
          }}
        >
          {l.t}
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// 7b) Top question bar — small "Q. ..." reminder shown during the answer.
// =============================================================================
export const QTopBar: React.FC<{ text: string }> = ({ text }) => {
  const o = useEnter(8);
  return (
    <div
      style={{
        position: "absolute",
        top: 30,
        left: "50%",
        transform: "translateX(-50%)",
        opacity: o,
        background: "rgba(255,255,255,0.82)",
        color: "#27304d",
        fontFamily: NOTO_SANS_THAI,
        fontSize: 27,
        fontWeight: 700,
        padding: "8px 22px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
      }}
    >
      <span style={{ fontWeight: 900, marginRight: 8 }}>Q.</span>
      {text}
    </div>
  );
};

// =============================================================================
// 8) Closing CTA card (엔딩 교체) — 한국어 검색바/웹목업을 덮는 풀스크린 태국어 CTA.
//    로고 + 태국어 헤드라인 + LINE OA + 웹사이트. AbsoluteFill 불투명.
// =============================================================================
export const ClosingCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoS = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });
  const ctaS = spring({ frame: frame - 14, fps, config: { damping: 15, mass: 0.7 } });
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 40%, #ffffff 0%, #f2f6f1 62%, #e6efe5 100%)",
        opacity: fadeIn,
        fontFamily: NOTO_SANS_THAI,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <Img
        src={staticFile("images/logo_187growup.png")}
        style={{ width: 360, height: "auto", transform: `scale(${0.78 + 0.22 * logoS})`, marginBottom: 46 }}
      />
      <div style={{ fontSize: 78, fontWeight: 900, color: "#1f2a1c", lineHeight: 1.18, letterSpacing: 0.3 }}>
        ปรึกษาการเติบโตของลูก
        <br />
        <span style={{ color: "#22b14c" }}>ฟรีวันนี้</span>
      </div>
      <div style={{ fontSize: 33, fontWeight: 600, color: "#5a6553", marginTop: 24 }}>
        ดูแลการเจริญเติบโตอย่างเป็นระบบ ที่คลินิก Yonsei Saebom
      </div>
      <div
        style={{
          display: "flex",
          gap: 26,
          alignItems: "center",
          marginTop: 64,
          transform: `translateY(${(1 - ctaS) * 28}px)`,
          opacity: interpolate(ctaS, [0, 1], [0, 1]),
        }}
      >
        <div style={{ background: "#06C755", color: "#fff", fontSize: 40, fontWeight: 800, padding: "18px 42px", borderRadius: 999, boxShadow: "0 8px 22px rgba(6,199,85,0.35)" }}>
          LINE&nbsp;&nbsp;@894qhqtu
        </div>
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, color: "#1f2a1c", marginTop: 34, letterSpacing: 0.5 }}>
        dr187growup.com
      </div>
    </AbsoluteFill>
  );
};
