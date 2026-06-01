// Promo Scene 5: Child-actor proof grid (visit) — photos only, no efficacy bars
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

export const CasesScene: React.FC<{ line?: string }> = ({ line }) => {
  const L = t();
  const frame = useCurrentFrame();

  const gridOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const gridScale = interpolate(frame, [0, 150], [1.0, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const capOpacity = interpolate(frame, [10, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const capY = interpolate(frame, [10, 26], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.tealDarkest }}>
      {/* Actors grid (top square) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1180,
          overflow: "hidden",
          opacity: gridOpacity,
        }}
      >
        <Img
          src={staticFile("images/actors-grid.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${gridScale})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 45%, rgba(26,58,50,0.96) 100%)",
          }}
        />
      </div>

      {/* Visit-proof caption (lower band, no efficacy numbers near faces) */}
      <div
        style={{
          position: "absolute",
          top: 1180,
          left: 60,
          right: 60,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: capOpacity,
          transform: `translateY(${capY}px)`,
        }}
      >
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 56,
            fontWeight: 800,
            color: COLORS.white,
            textAlign: "center",
            lineHeight: 1.35,
            textShadow: "0 6px 28px rgba(0,0,0,0.6)",
          }}
        >
          {line ?? L.casesActorsLine}
        </span>
      </div>
    </AbsoluteFill>
  );
};
