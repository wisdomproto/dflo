// Scene 2: Calculator form — matching v4 HeightCalculator.tsx
// Hero section visible behind the bottom sheet modal
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
import { COLORS, SFX } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR, INTER } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

const FORM_DELAY = 15;

export const InputScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Modal slide-up
  const modalY = interpolate(frame, [0, 15], [800, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const overlayOpacity = interpolate(frame, [0, 15], [0, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Gender: male stays selected (matching SAMPLE_GENDER = "male")
  const isFemale = false;

  // Field typing delays
  const birthDelay = FORM_DELAY + 45;
  const birthText = "2016-03-15";
  const birthChars = Math.floor(
    interpolate(frame, [birthDelay, birthDelay + 25], [0, birthText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const heightDelay = birthDelay + 30;
  const heightText = "138.0";
  const heightChars = Math.floor(
    interpolate(frame, [heightDelay, heightDelay + 15], [0, heightText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const weightDelay = heightDelay + 20;
  const weightText = "32.5";
  const weightChars = Math.floor(
    interpolate(frame, [weightDelay, weightDelay + 12], [0, weightText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const btnDelay = weightDelay + 18;
  const btnScale =
    frame >= btnDelay
      ? spring({ frame: frame - btnDelay, fps, config: { damping: 12 } })
      : 0;

  const btnPressed =
    frame >= btnDelay + 25
      ? interpolate(frame, [btnDelay + 25, btnDelay + 30], [1, 0.96], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 16,
    border: `2px solid ${COLORS.gray200}`,
    padding: "16px 18px",
    fontFamily: INTER,
    fontSize: 20,
    color: COLORS.gray900,
    backgroundColor: COLORS.white,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: NOTO_SANS_KR,
    fontSize: 15,
    fontWeight: 500,
    color: COLORS.gray500,
    marginBottom: 6,
    display: "block",
  };

  return (
    <AbsoluteFill>
      {/* Hero background behind modal */}
      <HeroBackground />

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
        }}
      />

      {/* Bottom sheet modal */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: COLORS.white,
          borderRadius: "32px 32px 0 0",
          padding: "40px 50px 60px",
          transform: `translateY(${modalY}px)`,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Header */}
        <div>
          <span
            style={{
              fontFamily: NOTO_SANS_KR,
              fontSize: 15,
              fontWeight: 600,
              color: COLORS.teal,
              display: "block",
              marginBottom: 6,
            }}
          >
            {L.inputLabel}
          </span>
          <span
            style={{
              fontFamily: NOTO_SANS_KR,
              fontSize: 28,
              fontWeight: 800,
              color: COLORS.gray900,
            }}
          >
            {L.inputTitle}
          </span>
        </div>
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 17,
            color: COLORS.gray500,
            marginTop: -12,
          }}
        >
          {L.inputDesc}
        </span>

        {/* Gender toggle */}
        <div>
          <span style={labelStyle}>{L.genderLabel}</span>
          <div style={{ display: "flex", gap: 10 }}>
            {(["male", "female"] as const).map((g) => {
              const isActive = isFemale ? g === "female" : g === "male";
              return (
                <div
                  key={g}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    padding: "14px 0",
                    textAlign: "center",
                    backgroundColor: isActive ? COLORS.teal : COLORS.gray100,
                    fontFamily: NOTO_SANS_KR,
                    fontSize: 18,
                    fontWeight: 600,
                    color: isActive ? COLORS.white : COLORS.gray600,
                  }}
                >
                  {g === "male" ? L.genderMale : L.genderFemale}
                </div>
              );
            })}
          </div>
        </div>

        {/* Birth date */}
        <div>
          <span style={labelStyle}>{L.birthLabel}</span>
          <div style={inputStyle}>
            {birthText.slice(0, birthChars) || "\u00A0"}
            {birthChars > 0 && birthChars < birthText.length && (
              <span style={{ color: COLORS.teal, opacity: Math.floor(frame / 8) % 2 }}>|</span>
            )}
          </div>
        </div>

        {/* Height / Weight */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <span style={labelStyle}>{L.heightLabel}</span>
            <div style={inputStyle}>
              {heightText.slice(0, heightChars) || <span style={{ color: COLORS.gray400 }}>0.0</span>}
            </div>
          </div>
          <div>
            <span style={labelStyle}>{L.weightLabel}</span>
            <div style={inputStyle}>
              {weightText.slice(0, weightChars) || <span style={{ color: COLORS.gray400 }}>0.0</span>}
            </div>
          </div>
        </div>

        {/* Calculate button */}
        <div
          style={{
            backgroundColor: COLORS.teal,
            borderRadius: 16,
            padding: "20px 0",
            textAlign: "center",
            transform: `scale(${btnScale * btnPressed})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 20 }}>📊</span>
          <span
            style={{
              fontFamily: NOTO_SANS_KR,
              fontSize: 20,
              fontWeight: 700,
              color: COLORS.white,
            }}
          >
            {L.calcButton}
          </span>
        </div>
      </div>

      {/* SFX */}
      <Sequence from={FORM_DELAY + 10} durationInFrames={15} layout="none">
        <Audio src={SFX.click} volume={0.4} />
      </Sequence>
      <Sequence from={btnDelay + 25} durationInFrames={15} layout="none">
        <Audio src={SFX.click} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
