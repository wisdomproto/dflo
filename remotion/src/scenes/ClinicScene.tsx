// Promo Scene 4 (combined): director + success stats (fixed top) over a sliding clinic montage (bottom).
// Korea is reinforced by the badge pill ("กังนัม เกาหลี") and by ending the montage on the Korean "새봄" neon sign.
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR, INTER } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

const PURPLE_BG =
  "linear-gradient(180deg, #667eea 0%, #764ba2 58%, #5b3a8c 100%)";

const BAND_TOP = 1000;
const BAND_H = 920;

// Bottom montage — 4 facility photos, ending (and holding) on the Korean "새봄" neon sign.
const BOTTOM = [
  { src: "images/clinic-interior.jpg", pos: "center" },
  { src: "images/clinic-entrance.jpg", pos: "center" },
  { src: "images/facility-2.jpg", pos: "center" },
  { src: "images/facility-1.jpg", pos: "72% center" },
];

export const ClinicScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badgeOpacity = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const portraitSpring = spring({ frame, fps, config: { damping: 14 } });

  // Bottom filmstrip: hold → slide → hold across the 4 photos, ending on the neon sign.
  const slideX = interpolate(
    frame,
    [0, 18, 48, 66, 96, 114, 144, 200],
    [0, 0, -1080, -1080, -2160, -2160, -3240, -3240],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const reveal = (delay: number) => {
    const p = interpolate(frame, [delay, delay + 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { opacity: p, transform: `translateY(${(1 - p) * 24}px)` };
  };

  const counter = (target: number, delay: number) => {
    const v = interpolate(frame, [delay, delay + 45], [0, target], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    const n = Math.round(v);
    return target >= 1000 ? n.toLocaleString("en-US") : String(n);
  };

  const StatBlock: React.FC<{
    target: number;
    suffix: string;
    label: string;
    delay: number;
  }> = ({ target, suffix, label, delay }) => (
    <div style={reveal(delay)}>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span
          style={{
            fontFamily: INTER,
            fontSize: 104,
            fontWeight: 900,
            color: COLORS.accent,
            lineHeight: 1,
          }}
        >
          {counter(target, delay)}
        </span>
        <span
          style={{
            fontFamily: INTER,
            fontSize: 52,
            fontWeight: 800,
            color: COLORS.accent,
            marginLeft: 4,
          }}
        >
          {suffix}
        </span>
      </div>
      <span
        style={{
          display: "block",
          fontFamily: NOTO_SANS_KR,
          fontSize: 32,
          fontWeight: 600,
          color: COLORS.white,
          marginTop: 8,
        }}
      >
        {label}
      </span>
    </div>
  );

  return (
    <AbsoluteFill style={{ background: PURPLE_BG, opacity: sceneOpacity }}>
      {/* Korea badge (top, centered) */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: badgeOpacity,
        }}
      >
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 36,
            fontWeight: 800,
            color: COLORS.white,
            backgroundColor: "rgba(15,110,86,0.92)",
            borderRadius: 60,
            padding: "16px 40px",
            boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
            textAlign: "center",
          }}
        >
          {L.clinicKoreaBadge}
        </span>
      </div>

      {/* Director portrait (top-left) */}
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 210,
          width: 430,
          height: 540,
          borderRadius: 36,
          overflow: "hidden",
          transform: `scale(${portraitSpring})`,
          transformOrigin: "center",
          backgroundColor: COLORS.white,
          border: `5px solid ${COLORS.whiteAlpha80}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <Img
          src={staticFile("images/director.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />
      </div>

      {/* Clinic name + years (under portrait) */}
      <div style={{ position: "absolute", left: 70, top: 768, width: 430 }}>
        <span
          style={{
            display: "block",
            fontFamily: NOTO_SANS_KR,
            fontSize: 40,
            fontWeight: 900,
            color: COLORS.white,
            lineHeight: 1.2,
            whiteSpace: "pre-line",
            ...reveal(14),
          }}
        >
          {L.clinicName}
        </span>
        <span
          style={{
            display: "block",
            fontFamily: NOTO_SANS_KR,
            fontSize: 27,
            fontWeight: 500,
            color: COLORS.whiteAlpha80,
            marginTop: 12,
            ...reveal(20),
          }}
        >
          {L.clinicYears}
        </span>
      </div>

      {/* Success stats (top-right) */}
      <div
        style={{
          position: "absolute",
          right: 70,
          top: 250,
          width: 460,
          display: "flex",
          flexDirection: "column",
          gap: 56,
        }}
      >
        <StatBlock
          target={L.statsCount1}
          suffix={L.statsSuffix1}
          label={L.statsLabel1}
          delay={18}
        />
        <StatBlock
          target={L.statsCount2}
          suffix={L.statsSuffix2}
          label={L.statsLabel2}
          delay={32}
        />
      </div>

      {/* Bottom sliding facility montage */}
      <div
        style={{
          position: "absolute",
          top: BAND_TOP,
          left: 0,
          width: 1080,
          height: BAND_H,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            height: "100%",
            width: BOTTOM.length * 1080,
            transform: `translateX(${slideX}px)`,
          }}
        >
          {BOTTOM.map(({ src, pos }) => (
            <Img
              key={src}
              src={staticFile(src)}
              style={{
                width: 1080,
                height: "100%",
                objectFit: "cover",
                objectPosition: pos,
                flexShrink: 0,
              }}
            />
          ))}
        </div>
        {/* Top edge blend into the purple zone */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 120,
            background:
              "linear-gradient(180deg, rgba(91,58,140,0.95) 0%, rgba(91,58,140,0) 100%)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
