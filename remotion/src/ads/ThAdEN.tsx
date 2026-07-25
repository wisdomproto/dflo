// 태국 광고영상 영어판 — 자막 없는 원본 위에 영어 텍스트/라벨을 얹는다.
//
// 아이콘 구간(18.4~23.3s): 원본(자막X)에는 원·아이콘이 아예 없다(전부 오버레이).
//   ★태국어본을 깔고 라벨만 덮는 방식은 실패한다 — 원이 날아오는 애니메이션이라
//     정착 좌표에 라벨을 고정하면 비행 중 원과 따로 논다. 프레임 추적도 비행 구간을 놓친다.
//   → 태국어본에서 원+아이콘을 이미지로 떼어내(라벨은 원 색으로 지움) 여기서 직접 배치·애니메이션한다.
//
// 좌표는 1920x1080 기준. 세로 608x1080 콘텐츠가 x656~1263 에 레터박스돼 있어
// 모든 텍스트는 그 폭 안에 가둔다(넘치면 잘린다).
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ensureFonts, PRETENDARD } from "../lib/fonts";
import NARRATION from "./thadEnNarration.json";

ensureFonts();

export const THAD_EN_FPS = 30;
export const THAD_EN_DURATION = Math.round(28.72 * THAD_EN_FPS); // 862

const PINK = "#c95be0";
const RING = "#763b6f";
const WHITE = "#ffffff";
const COL_LEFT = 656;   // 세로 콘텐츠 좌측
const COL_W = 608;      // 세로 콘텐츠 폭
const PAD = 26;         // 좌우 여백

const s = (sec: number) => Math.round(sec * THAD_EN_FPS);
const fade = (f: number, len: number, d = 5) =>
  interpolate(f, [0, d, len - d, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 모든 텍스트는 콘텐츠 칼럼 안에서만 산다 — 넘치면 줄바꿈되지 잘리지 않는다.
const Line: React.FC<{
  children: React.ReactNode; color?: string; size?: number; top: number; align?: "center" | "left";
}> = ({ children, color = WHITE, size = 46, top, align = "center" }) => (
  <div style={{
    position: "absolute", top, left: COL_LEFT + PAD, width: COL_W - PAD * 2,
    textAlign: align, fontFamily: PRETENDARD, fontWeight: 800, fontSize: size, color,
    lineHeight: 1.16, letterSpacing: "-0.015em", overflowWrap: "break-word",
    textShadow: "0 3px 14px rgba(0,0,0,.55)", whiteSpace: "pre-line",
  }}>{children}</div>
);

const Block: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: fade(f, len) }}>{children}</AbsoluteFill>;
};

// 원본에서 떼어낸 원+아이콘. 아이 쪽에서 튀어나와 제자리에 앉는다(원본 동작 재현).
const R = 73;
const ORIGIN = { x: 959, y: 585 };   // 아이 몸통 — 여기서 퍼져 나간다
const IconBubble: React.FC<{
  name: string; cx: number; cy: number; label: string; dark?: boolean; settleAt: number;
}> = ({ name, cx, cy, label, dark, settleAt }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - settleAt + 12, fps, config: { damping: 14, mass: 0.7 } });
  if (f < settleAt - 14) return null;
  const x = interpolate(p, [0, 1], [ORIGIN.x, cx]);
  const y = interpolate(p, [0, 1], [ORIGIN.y, cy]);
  const sc = interpolate(p, [0, 1], [0.25, 1]);
  return (
    <div style={{
      position: "absolute", left: x - R, top: y - R, width: R * 2, height: R * 2,
      transform: `scale(${sc})`, opacity: Math.min(1, p * 2.2),
    }}>
      {/* 링은 원본에서 떼면 배경(셔츠·조명)이 비쳐 얼룩진다 → 안쪽 원만 쓰고 링은 여기서 그린다 */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: `2px solid ${RING}`, boxSizing: "border-box",
      }} />
      <Img src={staticFile(`ads/thad/icons/${name}.png`)} style={{ width: "100%", height: "100%" }} />
      {/* 라벨 위치는 원본 태국어 라벨(중심 +23px)에 맞춘다 */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: R + 12, textAlign: "center",
        // 원본 태국어 라벨은 획이 얇아 아이콘과 붙어도 답답하지 않다.
        // ExtraBold 로는 뭉쳐 보여 한 단계 낮추고 크기도 줄인다(원본 글자 높이 ≈24px).
        fontFamily: PRETENDARD, fontWeight: 700, fontSize: 20,
        color: dark ? WHITE : "#6b3fa0", letterSpacing: "-0.02em",
      }}>{label}</div>
    </div>
  );
};


// 나레이션 자막 — 시각/문구를 손으로 적지 않고 믹스 산출(thadEnNarration.json)을 그대로 쓴다.
// TTS 길이는 실행마다 달라지므로 이렇게 해야 소리와 절대 어긋나지 않는다.
const NarrationSubs: React.FC = () => (
  <>
    {NARRATION.map((n) => {
      const from = Math.round(n.at * THAD_EN_FPS);
      const len = Math.max(1, Math.round((n.end - n.at) * THAD_EN_FPS));
      return (
        <Sequence key={n.id} from={from} durationInFrames={len}>
          <div style={{
            position: "absolute", left: COL_LEFT + 16, width: COL_W - 32, bottom: 24,
            textAlign: "center", fontFamily: PRETENDARD, fontWeight: 700, fontSize: 27,
            color: "#fff", lineHeight: 1.3, letterSpacing: "-0.01em",
            textShadow: "0 2px 10px rgba(0,0,0,.9), 0 0 22px rgba(0,0,0,.8)",
          }}>{n.text}</div>
        </Sequence>
      );
    })}
  </>
);

export const ThAdEN: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <OffthreadVideo src={staticFile("ads/thad/clean.mp4")} muted />

    {/* 5축 아이콘 — 원본과 같은 순서·간격으로 하나씩 자리를 잡는다 */}
    <Sequence from={s(18.4)} durationInFrames={s(23.35) - s(18.4)}>
      <IconBubble name="medical"   cx={799}  cy={316} label="Medical"   settleAt={s(0.67)} />
      <IconBubble name="sleep"     cx={1118} cy={316} label="Sleep"     settleAt={s(1.43)} dark />
      <IconBubble name="nutrition" cx={799}  cy={596} label="Nutrition" settleAt={s(2.27)} />
      <IconBubble name="posture"   cx={1118} cy={595} label="Posture"   settleAt={s(3.07)} />
      <IconBubble name="exercise"  cx={959}  cy={839} label="Exercise"  settleAt={s(4.10)} dark />
      {/* 원본엔 이 장면에 자막이 없어 "따로따로가 아니라 함께 본다"는 메시지가 전달되지 않았다.
          마지막 아이콘이 앉은 뒤 한 줄 띄운다(아이콘 등장과 겹치지 않게). */}
      {/* 세 번째 아이콘이 앉을 즈음부터 장면 끝까지 — 0.6초만 스쳐 지나가던 걸 늘렸다.
          "다른 곳은 하나만 본다"는 전제를 모르는 첫 시청자도 알아듣게 우리가 하는 것만 명시한다
          (비교 표현은 의료광고법 56조). */}
      <Sequence from={s(1.9)}>
        <Block len={s(23.35) - s(18.4) - s(1.9)}>
          <Line top={930} size={32} color={PINK}>{"Integrated growth care"}</Line>
        </Block>
      </Sequence>
    </Sequence>

    {/* 1) 훅 */}
    <Sequence from={s(0.1)} durationInFrames={s(3.2) - s(0.1)}>
      <Block len={s(3.2) - s(0.1)}>
        <Line top={452} size={52}>{"Worried about\nyour child's height?"}</Line>
      </Block>
    </Sequence>

    {/* 2) 클리닉 소개 */}
    <Sequence from={s(3.5)} durationInFrames={s(5.9) - s(3.5)}>
      <Block len={s(5.9) - s(3.5)}>
        <Line top={744} size={42} color={PINK} align="left">{"Growth specialist clinic"}</Line>
        <Line top={876} size={42} align="left">{"in Gangnam, South Korea"}</Line>
      </Block>
    </Sequence>

    {/* 3) 후기 (한국어 후기 스크린샷은 그대로) */}
    <Sequence from={s(6.0)} durationInFrames={s(10.8) - s(6.0)}>
      <Block len={s(10.8) - s(6.0)}>
        <Line top={846} size={44}>{"What parents are saying"}</Line>
      </Block>
    </Sequence>

    {/* 4) 아시아 선두 */}
    <Sequence from={s(13.5)} durationInFrames={s(18.2) - s(13.5)}>
      <Block len={s(18.2) - s(13.5)}>
        <Line top={798} size={42} color={PINK}>{"Asia's leading"}</Line>
        <Line top={854} size={48}>{"growth clinic"}</Line>
      </Block>
    </Sequence>

    {/* 6) 셀럽 */}
    <Sequence from={s(23.5)} durationInFrames={s(26.2) - s(23.5)}>
      <Block len={s(26.2) - s(23.5)}>
        <Line top={842} size={40} color={PINK}>{"Celebrities who visited"}</Line>
        <Line top={898} size={50}>{"187growup"}</Line>
      </Block>
    </Sequence>

    {/* 7) CTA + URL */}
    <Sequence from={s(26.5)}>
      <Block len={s(28.72) - s(26.5)}>
        <Line top={456} size={50}>{"Start caring for your\nchild's height today"}</Line>
        <div style={{ position: "absolute", top: 624, left: COL_LEFT, width: COL_W, display: "flex", justifyContent: "center" }}>
          <div style={{
            fontFamily: PRETENDARD, fontWeight: 700, fontSize: 25, color: WHITE,
            background: "rgba(255,255,255,.22)", borderRadius: 999, padding: "10px 24px",
          }}>dr187growup.com/en</div>
        </div>
      </Block>
    </Sequence>
    <NarrationSubs />
  </AbsoluteFill>
);
