// Reusable hero background — shown behind bottom sheet modals
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

export const HeroBackground: React.FC = () => {
  const L = t();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(180deg, #667eea 0%, #764ba2 60%, #5b3a8c 100%)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        padding: "120px 80px 0",
      }}
    >
      {/* Badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          backgroundColor: COLORS.whiteAlpha15,
          borderRadius: 50,
          padding: "8px 20px",
          marginBottom: 24,
          alignSelf: "flex-start",
        }}
      >
        <span style={{ fontSize: 18 }}>📏</span>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.whiteAlpha80,
          }}
        >
          {L.hookBadge}
        </span>
      </div>

      {/* Title */}
      <span
        style={{
          fontFamily: NOTO_SANS_KR,
          fontSize: 64,
          fontWeight: 800,
          color: COLORS.white,
          lineHeight: 1.2,
          whiteSpace: "pre-line",
        }}
      >
        {L.hookTitle}
      </span>

      <p
        style={{
          fontFamily: NOTO_SANS_KR,
          fontSize: 22,
          color: COLORS.whiteAlpha65,
          marginTop: 16,
        }}
      >
        {L.hookSubtitle}
      </p>
    </div>
  );
};
