// Scene 3: Result — count-up + chart simultaneously
// Count-up synced with trajectory animation
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  Sequence,
} from "remotion";
import { HeroBackground } from "../components/HeroBackground";
import { GrowthChartSvg } from "../components/GrowthChartSvg";
import { Particles } from "../components/Particles";
import {
  COLORS,
  SAMPLE_PREDICTED,
  SAMPLE_PERCENTILE,
  SAMPLE_GENDER,
  SAMPLE_AGE,
  SAMPLE_HEIGHT,
  SFX,
} from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR, INTER } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

export const ResultScene: React.FC = () => {
  const L = t();
  const SUBTITLES = [
    { from: 20, to: 80, text: L.sub1 },
    { from: 85, to: 155, text: L.sub2 },
    { from: 160, to: 230, text: L.sub3 },
    { from: 240, to: 340, text: L.sub4 },
  ];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Modal slide-up
  const modalY = interpolate(frame, [0, 18], [1200, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // --- Everything starts together ---
  // Percentile curves: frames 10-80
  const curvesProgress = interpolate(frame, [10, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Trajectory + count-up synced: frames 80-180
  const trajectoryProgress = interpolate(frame, [80, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Count-up synced with trajectory
  const countUpProgress = trajectoryProgress;
  const displayValue = (countUpProgress * SAMPLE_PREDICTED).toFixed(1);

  // Badges appear when trajectory starts
  const badgeOpacity = interpolate(frame, [80, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Final point + label
  const finalPointScale =
    frame >= 180
      ? spring({ frame: frame - 180, fps, config: { damping: 8 } })
      : 0;

  const chartLabelOpacity = interpolate(frame, [180, 195], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Annotations after trajectory done
  const annotationProgress = interpolate(frame, [200, 220], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Current subtitle
  const currentSub = SUBTITLES.find((s) => frame >= s.from && frame <= s.to);
  const subOpacity = currentSub
    ? interpolate(
        frame,
        [currentSub.from, currentSub.from + 10, currentSub.to - 10, currentSub.to],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  const ageYears = Math.floor(SAMPLE_AGE);
  const ageMonths = Math.round((SAMPLE_AGE % 1) * 12);

  return (
    <AbsoluteFill>
      <HeroBackground />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} />

      {/* Modal */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          top: 100,
          backgroundColor: COLORS.white,
          borderRadius: "32px 32px 0 0",
          padding: "28px 40px 40px",
          transform: `translateY(${modalY}px)`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Result header */}
        <div
          style={{
            backgroundColor: COLORS.tealLight,
            borderRadius: 20,
            padding: "18px 20px",
            textAlign: "center",
            position: "relative",
          }}
        >
          <p
            style={{
              fontFamily: NOTO_SANS_KR,
              fontSize: 18,
              fontWeight: 600,
              color: COLORS.teal,
              marginBottom: 2,
            }}
          >
            {L.resultLabel}
          </p>
          <div style={{ position: "relative", display: "inline-block" }}>
            <span
              style={{
                fontFamily: INTER,
                fontSize: 76,
                fontWeight: 900,
                color: COLORS.teal,
                lineHeight: 1,
              }}
            >
              {displayValue}
            </span>
            <span
              style={{
                fontFamily: INTER,
                fontSize: 30,
                fontWeight: 900,
                color: COLORS.teal,
              }}
            >
              {" "}{L.cm}
            </span>
            <Particles startFrame={180} cx={220} cy={30} />
          </div>

          <div
            style={{
              opacity: badgeOpacity,
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <span
              style={{
                fontFamily: NOTO_SANS_KR,
                fontSize: 15,
                fontWeight: 600,
                color: COLORS.white,
                backgroundColor: COLORS.teal,
                borderRadius: 50,
                padding: "4px 14px",
              }}
            >
              {(SAMPLE_GENDER as string) === "female" ? L.genderFemale.replace(/👧 ?/, "") : L.genderMale.replace(/👦 ?/, "")} · {ageYears}
              {ageMonths > 0 ? ` ${ageMonths}개월` : ""}
            </span>
            <span
              style={{
                fontFamily: NOTO_SANS_KR,
                fontSize: 15,
                fontWeight: 600,
                color: COLORS.teal,
                backgroundColor: COLORS.white,
                borderRadius: 50,
                padding: "4px 14px",
                border: `1px solid ${COLORS.teal}`,
              }}
            >
              {L.currentLabel} {SAMPLE_HEIGHT}cm
            </span>
          </div>
        </div>

        {/* Chart */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            borderRadius: 16,
            border: `1.5px solid ${COLORS.gray200}`,
            padding: "8px 6px 2px",
          }}
        >
          <GrowthChartSvg
            curvesProgress={curvesProgress}
            trajectoryProgress={trajectoryProgress}
            finalPointScale={finalPointScale}
            labelOpacity={chartLabelOpacity}
            predictedHeight={SAMPLE_PREDICTED}
            annotationProgress={annotationProgress}
          />
        </div>

        <p
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 14,
            color: COLORS.gray400,
            textAlign: "center",
          }}
        >
          {L.chartSource}
        </p>
      </div>

      {/* Subtitle bar */}
      {currentSub && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 40,
            right: 40,
            opacity: subOpacity,
            backgroundColor: "rgba(0,0,0,0.75)",
            borderRadius: 16,
            padding: "14px 24px",
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: NOTO_SANS_KR,
              fontSize: 22,
              fontWeight: 600,
              color: COLORS.white,
              lineHeight: 1.4,
            }}
          >
            {currentSub.text}
          </span>
        </div>
      )}

      <Sequence from={0} durationInFrames={30} layout="none">
        <Audio src={SFX.whoosh} volume={0.5} />
      </Sequence>
      <Sequence from={180} durationInFrames={30} layout="none">
        <Audio src={SFX.ding} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
