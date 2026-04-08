// Scene 5: CTA — matching v4 website branding
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Img,
  staticFile,
} from "remotion";
import { COLORS, WEBSITE_URL } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR, INTER } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

export const CtaScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const item = (delay: number) => ({
    transform: `translateY(${(1 - spring({ frame, fps, delay, config: { damping: 200 } })) * 60}px)`,
    opacity: spring({ frame, fps, delay, config: { damping: 200 } }),
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #667eea 0%, #764ba2 60%, #5b3a8c 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        padding: "0 80px",
      }}
    >
      {/* Logo */}
      <div style={item(0)}>
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: 28,
            backgroundColor: COLORS.white,
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <Img
            src={staticFile("images/logo.jpg")}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 16,
              objectFit: "contain",
            }}
          />
        </div>
      </div>

      {/* Main CTA text */}
      <div style={{ ...item(8), textAlign: "center" }}>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 52,
            fontWeight: 900,
            color: COLORS.white,
            lineHeight: 1.3,
            whiteSpace: "pre-line",
          }}
        >
          {L.ctaHeading}
        </span>
      </div>

      {/* CTA Button */}
      <div
        style={{
          ...item(16),
          backgroundColor: COLORS.white,
          borderRadius: 20,
          padding: "18px 44px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        <span style={{ fontSize: 20 }}>📐</span>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.teal,
          }}
        >
          {L.ctaButton}
        </span>
      </div>

      {/* URL */}
      <div
        style={{
          ...item(24),
          backgroundColor: COLORS.whiteAlpha15,
          borderRadius: 16,
          padding: "14px 36px",
        }}
      >
        <span
          style={{
            fontFamily: INTER,
            fontSize: 22,
            fontWeight: 600,
            color: COLORS.whiteAlpha80,
          }}
        >
          {WEBSITE_URL}
        </span>
      </div>

      {/* Subtext */}
      <div style={item(32)}>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 20,
            color: COLORS.whiteAlpha65,
          }}
        >
          {L.ctaClinic}
        </span>
      </div>
    </AbsoluteFill>
  );
};
