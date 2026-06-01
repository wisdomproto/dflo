// Marketing S5: social proof — kids (who dream of being actors/singers/athletes)
// from many countries who have visited. One-sentence caption + a grid of their photos.
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

const STARS = ["⭐", "🌟", "✨", "🌟", "⭐"];
// Set true once real kid photos land in public/images/celeb/kid-1..6.jpg.
const HAS_IMG = false;
const KIDS = [1, 2, 3, 4, 5, 6];

export const CelebScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleSpring = spring({ frame: frame - 6, fps, config: { damping: 13 } });
  const subO = interpolate(frame, [44, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(120% 90% at 50% 25%,#5b4391,#1d1530 72%)",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 32,
        padding: "0 50px",
        opacity: enter,
      }}
    >
      {/* Sparkle stars */}
      <div style={{ display: "flex", gap: 26, fontSize: 44 }}>
        {STARS.map((s, i) => {
          const o = interpolate(frame, [i * 4, i * 4 + 12], [0, 0.6], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <span key={i} style={{ opacity: o }}>
              {s}
            </span>
          );
        })}
      </div>

      {/* One-sentence caption */}
      <div
        style={{
          fontFamily: NOTO_SANS_KR,
          fontSize: 56,
          fontWeight: 900,
          color: "#fff",
          textAlign: "center",
          lineHeight: 1.35,
          whiteSpace: "pre-line",
          transform: `scale(${titleSpring})`,
          textShadow: "0 6px 30px rgba(0,0,0,0.45)",
        }}
      >
        {L.celebLine}
      </div>

      {/* Kid photo grid (3 × 2) — placeholder until real photos land */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          width: "100%",
          maxWidth: 780,
        }}
      >
        {KIDS.map((n, i) => {
          const s = spring({ frame: frame - (16 + i * 5), fps, config: { damping: 14 } });
          return (
            <div
              key={n}
              style={{
                aspectRatio: "1",
                borderRadius: 16,
                overflow: "hidden",
                transform: `scale(${s})`,
                opacity: s,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.22)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {HAS_IMG ? (
                <Img
                  src={staticFile(`images/celeb/kid-${n}.jpg`)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: NOTO_SANS_KR,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.whiteAlpha65,
                  }}
                >
                  아이 {n}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Brand sub */}
      <div
        style={{
          fontFamily: NOTO_SANS_KR,
          fontSize: 36,
          fontWeight: 600,
          color: COLORS.accent,
          opacity: subO,
          textAlign: "center",
        }}
      >
        {L.celebSub}
      </div>
    </AbsoluteFill>
  );
};
