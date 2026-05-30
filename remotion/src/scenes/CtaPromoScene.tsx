// Promo Scene 6: CTA — homepage primary + LINE secondary (Thai)
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR, INTER } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

const PURPLE_BG =
  "linear-gradient(180deg, #667eea 0%, #764ba2 60%, #5b3a8c 100%)";

export const CtaPromoScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const item = (delay: number) => {
    const p = spring({ frame, fps, delay, config: { damping: 200 } });
    return { transform: `translateY(${(1 - p) * 60}px)`, opacity: p };
  };

  return (
    <AbsoluteFill
      style={{
        background: PURPLE_BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 38,
        padding: "0 70px",
      }}
    >
      {/* English wordmark logo */}
      <div style={{ ...item(0) }}>
        <div
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 28,
            padding: "26px 36px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          }}
        >
          <Img
            src={staticFile(L.logo)}
            style={{
              width: 440,
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>

      {/* Heading */}
      <div style={{ ...item(8), textAlign: "center" }}>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 68,
            fontWeight: 900,
            color: COLORS.white,
            lineHeight: 1.3,
            whiteSpace: "pre-line",
          }}
        >
          {L.ctaPromoHeading}
        </span>
      </div>

      {/* Primary CTA: homepage measure */}
      <div
        style={{
          ...item(16),
          backgroundColor: COLORS.white,
          borderRadius: 24,
          padding: "26px 56px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        <span style={{ fontSize: 36 }}>📐</span>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 40,
            fontWeight: 800,
            color: COLORS.teal,
          }}
        >
          {L.ctaButton}
        </span>
      </div>

      {/* "measure it yourself on the website" line */}
      <div style={{ ...item(21), textAlign: "center", marginTop: -16 }}>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 32,
            fontWeight: 600,
            color: COLORS.white,
          }}
        >
          {L.ctaSiteMeasure}
        </span>
      </div>

      {/* Homepage URL */}
      <div
        style={{
          ...item(24),
          backgroundColor: COLORS.whiteAlpha15,
          borderRadius: 18,
          padding: "16px 40px",
          marginTop: -20,
        }}
      >
        <span
          style={{
            fontFamily: INTER,
            fontSize: 32,
            fontWeight: 700,
            color: COLORS.whiteAlpha80,
          }}
        >
          {L.siteUrl}
        </span>
      </div>

      {/* Secondary CTA: messenger pill (locale-aware — LINE for th, KakaoTalk for ko) */}
      <div
        style={{
          ...item(28),
          backgroundColor: L.ctaMessengerBg,
          borderRadius: 50,
          padding: "18px 44px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}
      >
        <span style={{ fontSize: 32 }}>💬</span>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 36,
            fontWeight: 700,
            color: L.ctaMessengerFg,
          }}
        >
          {L.ctaLinePill}
        </span>
      </div>

      {/* Clinic subtext */}
      <div style={{ ...item(34) }}>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 32,
            color: COLORS.whiteAlpha65,
          }}
        >
          {L.ctaClinic}
        </span>
      </div>
    </AbsoluteFill>
  );
};
