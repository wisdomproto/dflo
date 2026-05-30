// Promo Scene 5.5: Hope/stats — real treatment scale + success rate, "details on homepage"
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { COLORS, WEBSITE_URL } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR, INTER } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

const PURPLE_BG =
  "linear-gradient(180deg, #667eea 0%, #764ba2 60%, #5b3a8c 100%)";

const StatBlock: React.FC<{
  delay: number;
  target: number;
  suffix: string;
  label: string;
}> = ({ delay, target, suffix, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, delay, config: { damping: 200 } });
  const count = Math.round(
    interpolate(frame, [delay, delay + 45], [0, target], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );
  const display = target >= 1000 ? count.toLocaleString("en-US") : String(count);

  return (
    <div
      style={{
        transform: `translateY(${(1 - enter) * 50}px)`,
        opacity: enter,
        flex: 1,
        backgroundColor: COLORS.whiteAlpha15,
        borderRadius: 32,
        padding: "44px 24px 38px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span
          style={{
            fontFamily: INTER,
            fontSize: 110,
            fontWeight: 900,
            color: COLORS.white,
            lineHeight: 1,
          }}
        >
          {display}
        </span>
        <span
          style={{
            fontFamily: INTER,
            fontSize: 60,
            fontWeight: 900,
            color: COLORS.accent,
          }}
        >
          {suffix}
        </span>
      </div>
      <span
        style={{
          fontFamily: NOTO_SANS_KR,
          fontSize: 34,
          fontWeight: 600,
          color: COLORS.whiteAlpha80,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const StatsScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingP = spring({ frame, fps, config: { damping: 200 } });
  const footP = spring({ frame, fps, delay: 50, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: PURPLE_BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        padding: "0 70px",
      }}
    >
      {/* Hope heading */}
      <div
        style={{
          transform: `translateY(${(1 - headingP) * 40}px)`,
          opacity: headingP,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 64,
            fontWeight: 900,
            color: COLORS.white,
            lineHeight: 1.3,
            whiteSpace: "pre-line",
          }}
        >
          {L.statsHeading}
        </span>
      </div>

      {/* Two stat blocks */}
      <div style={{ display: "flex", gap: 28, width: "100%" }}>
        <StatBlock
          delay={14}
          target={L.statsCount1}
          suffix={L.statsSuffix1}
          label={L.statsLabel1}
        />
        <StatBlock
          delay={26}
          target={L.statsCount2}
          suffix={L.statsSuffix2}
          label={L.statsLabel2}
        />
      </div>

      {/* Footnote + homepage */}
      <div
        style={{
          transform: `translateY(${(1 - footP) * 30}px)`,
          opacity: footP,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 34,
            fontWeight: 500,
            color: COLORS.whiteAlpha80,
            textAlign: "center",
          }}
        >
          {L.statsFootnote}
        </span>
        <div
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 18,
            padding: "14px 38px",
          }}
        >
          <span
            style={{
              fontFamily: INTER,
              fontSize: 34,
              fontWeight: 800,
              color: COLORS.teal,
            }}
          >
            {WEBSITE_URL}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
