// Marketing S4: Celebrity positioning — "where foreign celebs & child actors go" (social proof)
import {
  AbsoluteFill,
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

export const CelebScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleSpring = spring({ frame: frame - 6, fps, config: { damping: 13 } });
  const subO = interpolate(frame, [26, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(120% 90% at 50% 25%,#5b4391,#1d1530 72%)",
        alignItems: "center",
        justifyContent: "center",
        opacity: enter,
      }}
    >
      <div style={{ display: "flex", gap: 30, fontSize: 64, marginBottom: 40 }}>
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

      <div
        style={{
          fontFamily: NOTO_SANS_KR,
          fontSize: 92,
          fontWeight: 900,
          color: "#fff",
          textAlign: "center",
          lineHeight: 1.3,
          whiteSpace: "pre-line",
          transform: `scale(${titleSpring})`,
          padding: "0 60px",
          textShadow: "0 6px 30px rgba(0,0,0,0.45)",
        }}
      >
        {L.celebLine}
      </div>

      <div
        style={{
          fontFamily: NOTO_SANS_KR,
          fontSize: 40,
          fontWeight: 600,
          color: COLORS.accent,
          marginTop: 40,
          opacity: subO,
          textAlign: "center",
        }}
      >
        {L.celebSub}
      </div>
    </AbsoluteFill>
  );
};
