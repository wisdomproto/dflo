// 통합 치료 씬 — growingup.mp4(아이가 점점 크는 영상) 위로,
// 5가지 통합 관리 아이콘을 하나씩: 화면 중앙에 "빡" 크게 등장 → 자기 자리로 날아가 안착.
// 안착 후엔 라벨이 뜨고 살짝 위아래로 float.
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR } from "../lib/fonts";

ensureFonts();

// 화면 중앙(크게 등장 위치) + 단계 타이밍
const CX = 540;
const CY = 900;
const BIG = 1.95; // 중앙에서 크게
const SMALL = 0.95; // 자기 자리 안착 크기
const TRAVEL_START = 16; // s+16 부터 자리로 이동 시작
const TRAVEL_END = 28; // s+28 안착

// 아이 얼굴/몸통 중앙을 피해 좌우 2열 + 하단 1개로 배치(순차 등장).
const ITEMS = [
  { icon: "images/integrated/icon-1.png", label: "의학적 치료", cx: 195, cy: 560 },
  { icon: "images/integrated/icon-2.png", label: "수면 관리", cx: 885, cy: 560 },
  { icon: "images/integrated/icon-3.png", label: "영양 관리", cx: 195, cy: 1070 },
  { icon: "images/integrated/icon-4.png", label: "성장 운동", cx: 885, cy: 1070 },
  { icon: "images/integrated/icon-5.png", label: "자세 교정", cx: 540, cy: 1380 },
];

const FloatIcon: React.FC<{
  icon: string;
  label: string;
  cx: number;
  cy: number;
  delay: number;
}> = ({ icon, label, cx, cy, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = delay;

  // 1) 중앙에서 크게 팝 (spring)
  const popIn = spring({
    frame,
    fps,
    delay: s,
    config: { damping: 12, stiffness: 150, mass: 0.6 },
  });
  const centerScale = 0.5 + popIn * (BIG - 0.5);

  // 2) 중앙 → 자기 자리 이동
  const travel = interpolate(frame, [s + TRAVEL_START, s + TRAVEL_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const x = interpolate(travel, [0, 1], [CX, cx]);
  const yBase = interpolate(travel, [0, 1], [CY, cy]);
  const scale = travel === 0 ? centerScale : interpolate(travel, [0, 1], [BIG, SMALL]);

  const opacity = interpolate(frame, [s, s + 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 3) 라벨은 중앙 등장과 동시에(아이콘 팝과 함께) 떠서 자리까지 유지
  const labelO = interpolate(frame, [s + 3, s + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const settled = frame > s + TRAVEL_END;
  const floatY = settled ? Math.sin((frame - (s + TRAVEL_END)) / 16) * 6 : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: yBase + floatY,
        width: 186,
        height: 186,
        opacity,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      <Img
        src={staticFile(icon)}
        style={{
          width: 186,
          height: 186,
          objectFit: "contain",
          display: "block",
          filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.5))",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: "calc(100% + 12px)",
          left: "50%",
          transform: "translateX(-50%)",
          opacity: labelO,
          fontFamily: NOTO_SANS_KR,
          fontSize: 31,
          fontWeight: 800,
          color: COLORS.white,
          background: "rgba(0,0,0,0.42)",
          borderRadius: 30,
          padding: "8px 22px",
          textShadow: "0 2px 10px rgba(0,0,0,0.6)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const IntegratedCareScene: React.FC<{
  src?: string;
  eyebrow?: string;
  caption?: string;
}> = ({ src = "videos/growingup.mp4", eyebrow = "187 통합 성장 관리", caption }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eyeO = interpolate(frame, [6, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#15131f", opacity: enter }}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* 위/아래 가독성 그라데이션 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(21,19,31,0.72) 0%, rgba(21,19,31,0.12) 26%, rgba(21,19,31,0.12) 72%, rgba(21,19,31,0.9) 100%)",
        }}
      />

      {/* 상단 eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: eyeO,
        }}
      >
        <span
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 44,
            fontWeight: 900,
            color: COLORS.accent,
            textShadow: "0 4px 22px rgba(0,0,0,0.7)",
          }}
        >
          {eyebrow}
        </span>
      </div>

      {/* 5가지 통합 관리 아이콘 — 시계방향 순차 등장 */}
      {ITEMS.map((it, i) => (
        <FloatIcon
          key={it.label}
          icon={it.icon}
          label={it.label}
          cx={it.cx}
          cy={it.cy}
          delay={4 + i * 28}
        />
      ))}

      {/* 하단 카피 (선택) */}
      {caption && (
        <div
          style={{
            position: "absolute",
            bottom: 130,
            left: 60,
            right: 60,
            textAlign: "center",
          }}
        >
          {caption.split("\n").map((ln, i) => (
            <div
              key={i}
              style={{
                fontFamily: NOTO_SANS_KR,
                fontSize: 58,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1.3,
                textShadow: "0 4px 24px rgba(0,0,0,0.8)",
              }}
            >
              {ln}
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
