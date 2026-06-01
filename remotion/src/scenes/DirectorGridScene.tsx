// Marketing S3 (between Clinic & VS): director's real practice + overseas lectures,
// shown as a tiled grid — visual proof of clinical depth + international standing.
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

// Set true once real photos/videos land in public/images/director/act-1..6.jpg.
// Tiles 1–3 = 진료(overseas-patient practice), 4–6 = 학부모 강연(talks to parents from various countries).
const HAS_IMG = false;
const TILES = [1, 2, 3, 4, 5, 6];

export const DirectorGridScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleO = interpolate(frame, [6, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [6, 22], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg,#5b4391 0%,#241733 100%)",
        opacity: enter,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 60px",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: NOTO_SANS_KR,
          fontSize: 58,
          fontWeight: 900,
          color: COLORS.white,
          textAlign: "center",
          lineHeight: 1.3,
          whiteSpace: "pre-line",
          marginBottom: 54,
          opacity: titleO,
          transform: `translateY(${titleY}px)`,
          textShadow: "0 4px 22px rgba(0,0,0,0.5)",
        }}
      >
        {L.directorGridTitle}
      </div>

      {/* Tiled grid (2 × 3) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 26,
          width: "100%",
          maxWidth: 940,
        }}
      >
        {TILES.map((n, i) => {
          const s = spring({ frame: frame - (14 + i * 6), fps, config: { damping: 14 } });
          const isPractice = n <= 3;
          return (
            <div
              key={n}
              style={{
                aspectRatio: "4 / 3",
                borderRadius: 22,
                overflow: "hidden",
                transform: `scale(${s})`,
                opacity: s,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "0 12px 34px rgba(0,0,0,0.35)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {HAS_IMG ? (
                <Img
                  src={staticFile(`images/director/act-${n}.jpg`)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <>
                  <span style={{ fontSize: 64, opacity: 0.6 }}>
                    {isPractice ? "🩺" : "🎤"}
                  </span>
                  <span
                    style={{
                      fontFamily: NOTO_SANS_KR,
                      fontSize: 24,
                      fontWeight: 600,
                      color: COLORS.whiteAlpha65,
                    }}
                  >
                    {isPractice ? "진료" : "학부모 강연"}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
