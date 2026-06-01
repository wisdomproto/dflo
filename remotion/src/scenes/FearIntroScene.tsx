// Marketing S1: hook — small vs tall contrast (visual) + "우리 아이 키 성장 / 골든타임" copy (universal)
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

// Set true once the S1 AI photo (public/images/fear-1.jpg) is added; until then CSS bar placeholder.
const HAS_IMG = false;

export const FearIntroScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const lines = L.fearGolden.split("\n");

  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const capO = interpolate(frame, [20, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const capY = interpolate(frame, [20, 36], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoom = interpolate(frame, [0, 120], [1.0, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(120% 90% at 30% 25%,#3f3a58,#15131f 75%)",
        opacity: enter,
      }}
    >
      {HAS_IMG ? (
        <Img
          src={staticFile("images/fear-1.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            bottom: 600,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: 64,
          }}
        >
          <div
            style={{
              width: 130,
              height: 340,
              borderRadius: "60px 60px 0 0",
              background: "linear-gradient(#7d5bb0,#3a2a55)",
              boxShadow: "0 0 70px rgba(125,91,176,0.5)",
            }}
          />
          <div
            style={{
              width: 130,
              height: 580,
              borderRadius: "60px 60px 0 0",
              background: "linear-gradient(#5a5470,#2c2940)",
              opacity: 0.85,
            }}
          />
          <div
            style={{
              width: 130,
              height: 500,
              borderRadius: "60px 60px 0 0",
              background: "linear-gradient(#5a5470,#2c2940)",
              opacity: 0.72,
            }}
          />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 38%, rgba(21,19,28,0.96) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 230,
          left: 60,
          right: 60,
          textAlign: "center",
          opacity: capO,
          transform: `translateY(${capY}px)`,
        }}
      >
        {lines.map((ln, i) => (
          <div
            key={i}
            style={{
              fontFamily: NOTO_SANS_KR,
              fontSize: 62,
              fontWeight: 800,
              color: i === lines.length - 1 ? COLORS.accent : "#fff",
              lineHeight: 1.4,
              textShadow: "0 4px 24px rgba(0,0,0,0.7)",
            }}
          >
            {ln}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
