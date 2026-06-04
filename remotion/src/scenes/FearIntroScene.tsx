// Marketing S1 (동남아/태국 신나는 톤): 화면 가운데에 "빡" 하고 한 줄씩 슬램 등장.
//  Phase A 질문  → "우리 아이 키, 걱정되시나요?"
//  Phase B 오퍼  → "이제 태국에서" / "아시아 최고의 성장 치료를" / "받을 수 있습니다"(accent)
import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR } from "../lib/fonts";
import { t } from "../lib/texts";

ensureFonts();

// 한 줄을 큰 스케일에서 "빡" 하고 들이치며 안착 (슬램 임팩트).
const SlamLine: React.FC<{
  text: string;
  fontSize: number;
  inStart: number;
  outStart?: number;
  outEnd?: number;
  color?: string;
}> = ({ text, fontSize, inStart, outStart, outEnd, color = "#fff" }) => {
  const frame = useCurrentFrame();

  const opacity =
    outStart != null && outEnd != null
      ? interpolate(frame, [inStart, inStart + 4, outStart, outEnd], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : interpolate(frame, [inStart, inStart + 4], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  // 1.45 → 1 로 빠르게 수축하며 들이치는 슬램 + 미세 오버슈트
  const scale = interpolate(frame, [inStart, inStart + 7, inStart + 11], [1.45, 0.97, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        fontFamily: NOTO_SANS_KR,
        fontSize,
        fontWeight: 900,
        color,
        lineHeight: 1.28,
        letterSpacing: "-0.5px",
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        textShadow: "0 6px 32px rgba(0,0,0,0.9)",
      }}
    >
      {text}
    </div>
  );
};

export const FearIntroScene: React.FC = () => {
  const L = t();
  const frame = useCurrentFrame();
  const offer = L.fearGolden.split("\n"); // 3 lines

  const enter = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase A 질문이 사라진 뒤 Phase B 오퍼 등장
  const OFFER_IN = [60, 76, 92]; // 줄별 등장 프레임 (한 줄씩)

  return (
    <AbsoluteFill style={{ background: "#15131f", opacity: enter }}>
      <OffthreadVideo
        src={staticFile("videos/intro.mp4")}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* 가독성: 중앙 집중 라디얼 + 하단 그라데이션 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 46%, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.22) 42%, rgba(0,0,0,0) 74%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 40%, rgba(21,19,28,0.7) 100%)",
        }}
      />

      {/* Phase A — 질문 (화면 중앙) */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 60px",
          textAlign: "center",
        }}
      >
        <SlamLine text={L.fearQuestion} fontSize={74} inStart={6} outStart={46} outEnd={54} />
      </AbsoluteFill>

      {/* Phase B — 오퍼 (화면 중앙, 한 줄씩 슬램. 3줄 슬롯을 미리 잡아 중앙 고정) */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 50px",
          textAlign: "center",
          gap: 6,
        }}
      >
        {offer.map((ln, i) => (
          <SlamLine
            key={i}
            text={ln}
            fontSize={66}
            inStart={OFFER_IN[i] ?? 92}
            color={i === offer.length - 1 ? COLORS.accent : "#fff"}
          />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
