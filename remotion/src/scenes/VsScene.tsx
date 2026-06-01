// Marketing S3: VS differentiation — single injection (left) vs 187's 6-part multi-modal care (right)
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR, INTER } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

const ICONS = ["💗", "⚖️", "🧍", "🏋️", "🌙", "🍎"];

export const VsScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const vsPop = spring({ frame: frame - 10, fps, config: { damping: 9 } });
  const punchO = interpolate(frame, [70, 88], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const punchY = interpolate(frame, [70, 88], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ flexDirection: "row", opacity: enter }}>
      {/* Left — other clinic */}
      <div
        style={{
          flex: 1,
          background: "linear-gradient(180deg,#2b2b30,#1a1a1e)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          paddingBottom: 380,
        }}
      >
        <div
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 46,
            fontWeight: 800,
            color: "rgba(255,255,255,0.85)",
            textAlign: "center",
          }}
        >
          {L.vsLeftTitle}
        </div>
        <div style={{ fontSize: 130, filter: "grayscale(0.6)", opacity: 0.7 }}>💉</div>
        <div
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 30,
            fontWeight: 500,
            color: "rgba(255,255,255,0.5)",
            textAlign: "center",
          }}
        >
          {L.vsLeftDesc}
        </div>
      </div>

      {/* Right — 187 multi-modal */}
      <div
        style={{
          flex: 1,
          background: "linear-gradient(180deg,#5b4391,#34245c)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 34,
          paddingBottom: 380,
        }}
      >
        <div
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 46,
            fontWeight: 900,
            color: COLORS.accent,
            textAlign: "center",
          }}
        >
          {L.vsRightTitle}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px 40px" }}>
          {L.vsItems.map((item, i) => {
            const s = spring({ frame: frame - (16 + i * 7), fps, config: { damping: 12 } });
            return (
              <div
                key={item}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  transform: `scale(${s})`,
                  opacity: s,
                }}
              >
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.14)",
                    border: "2px solid rgba(255,255,255,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 46,
                  }}
                >
                  {ICONS[i]}
                </div>
                <div
                  style={{
                    fontFamily: NOTO_SANS_KR,
                    fontSize: 23,
                    fontWeight: 600,
                    color: "#fff",
                    textAlign: "center",
                    maxWidth: 160,
                    lineHeight: 1.2,
                  }}
                >
                  {item}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center VS badge */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: `translate(-50%,-50%) scale(${vsPop})`,
          width: 156,
          height: 156,
          borderRadius: "50%",
          background: COLORS.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: INTER,
          fontSize: 66,
          fontWeight: 900,
          fontStyle: "italic",
          color: "#241a08",
          boxShadow: "0 12px 44px rgba(0,0,0,0.55)",
        }}
      >
        VS
      </div>

      {/* Bottom punch line */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 50,
          right: 50,
          textAlign: "center",
          opacity: punchO,
          transform: `translateY(${punchY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 54,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.35,
            whiteSpace: "pre-line",
            textShadow: "0 4px 22px rgba(0,0,0,0.7)",
          }}
        >
          {L.vsPunch}
        </div>
      </div>
    </AbsoluteFill>
  );
};
