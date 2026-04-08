// Scene 4: Growth chart — matching v4 HeightCalculatorResult chart colors
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
import { GrowthChartSvg } from "../components/GrowthChartSvg";
import { COLORS, SAMPLE_PREDICTED, SFX } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR } from "../lib/fonts";

ensureFonts();

export const ChartScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardScale = spring({ frame, fps, config: { damping: 200 } });
  const cardOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const curvesProgress = interpolate(frame, [20, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const trajectoryProgress = interpolate(frame, [110, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const finalPointScale =
    frame >= 180
      ? spring({ frame: frame - 180, fps, config: { damping: 8 } })
      : 0;

  const labelOpacity = interpolate(frame, [180, 200], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Source note fade in
  const noteOpacity = interpolate(frame, [190, 210], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.white,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 40px",
      }}
    >
      {/* Title */}
      <div
        style={{
          marginBottom: 20,
          opacity: cardOpacity,
          transform: `scale(${cardScale})`,
        }}
      >
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 32,
            fontWeight: 800,
            color: COLORS.gray900,
          }}
        >
          성장 예측 도표
        </span>
      </div>

      {/* Chart card */}
      <div
        style={{
          backgroundColor: COLORS.white,
          borderRadius: 24,
          padding: "24px 16px 16px",
          width: "100%",
          opacity: cardOpacity,
          transform: `scale(${cardScale})`,
          border: `2px solid ${COLORS.gray200}`,
        }}
      >
        <GrowthChartSvg
          curvesProgress={curvesProgress}
          trajectoryProgress={trajectoryProgress}
          finalPointScale={finalPointScale}
          labelOpacity={labelOpacity}
          predictedHeight={SAMPLE_PREDICTED}
        />
      </div>

      {/* Source note */}
      <p
        style={{
          opacity: noteOpacity,
          fontFamily: NOTO_SANS_KR,
          fontSize: 14,
          color: COLORS.gray400,
          textAlign: "center",
          marginTop: 10,
        }}
      >
        한국 소아 성장 표준 (2017 질병관리청) · 5th / 50th / 95th 백분위
      </p>

      <Sequence from={20} durationInFrames={30} layout="none">
        <Audio src={SFX.whoosh} volume={0.4} />
      </Sequence>
    </AbsoluteFill>
  );
};
