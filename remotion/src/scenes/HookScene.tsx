// Scene 1: Hero section — matching v4 HeroSection.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  Img,
  staticFile,
} from "remotion";
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

export const HookScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Badge entrance
  const badgeOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const badgeY = interpolate(frame, [0, 15], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Title typewriter
  const TITLE = L.hookTitle;
  const totalChars = TITLE.length;
  const charsToShow = Math.floor(
    interpolate(frame, [10, 2 * fps], [0, totalChars], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );
  const visibleTitle = TITLE.slice(0, charsToShow);
  const cursorOn = charsToShow < totalChars && Math.floor(frame / 8) % 2 === 0;

  // Subtitle fade
  const subOpacity = interpolate(frame, [2 * fps, 2 * fps + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // CTA button spring
  const btnScale =
    frame >= 2.5 * fps
      ? spring({ frame: frame - 2.5 * fps, fps, config: { damping: 12 } })
      : 0;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #667eea 0%, #764ba2 60%, #5b3a8c 100%)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 80px",
      }}
    >
      {/* Brand logo (from homepage) */}
      <div
        style={{
          opacity: badgeOpacity,
          transform: `translateY(${badgeY}px)`,
          backgroundColor: COLORS.white,
          borderRadius: 20,
          padding: "18px 26px",
          marginBottom: 34,
          alignSelf: "flex-start",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        }}
      >
        <Img
          src={staticFile(L.logo)}
          style={{
            height: 64,
            width: "auto",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 80,
            fontWeight: 800,
            color: COLORS.white,
            lineHeight: 1.2,
            whiteSpace: "pre-line",
          }}
        >
          {visibleTitle}
          {cursorOn && (
            <span style={{ color: COLORS.accent }}>|</span>
          )}
        </span>
      </div>

      {/* Subtitle */}
      <p
        style={{
          opacity: subOpacity,
          fontFamily: NOTO_SANS_KR,
          fontSize: 34,
          color: COLORS.whiteAlpha65,
          marginBottom: 40,
        }}
      >
        {L.hookSubtitle}
      </p>

      {/* CTA Button */}
      <div
        style={{
          transform: `scale(${btnScale})`,
          backgroundColor: COLORS.white,
          borderRadius: 20,
          padding: "20px 40px",
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          alignSelf: "flex-start",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        <span style={{ fontSize: 30 }}>📐</span>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 30,
            fontWeight: 700,
            color: COLORS.teal,
          }}
        >
          {L.hookCta}
        </span>
      </div>
    </AbsoluteFill>
  );
};
