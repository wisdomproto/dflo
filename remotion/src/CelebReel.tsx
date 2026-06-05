// 9:16 reel — celebrity children treated at the 187 Growth Clinic.
// Two screens, three people each (one person per row). Each row centers the
// headshot + work collage + name/role/works as one group. Purple backdrop to
// match the logo, which sits (white, transparent bg) pinned at the bottom.
import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { ensureFonts, NOTO_SANS_KR } from "./lib/fonts";

ensureFonts();

const PURPLE = "#4A2D6B";

type Person = {
  img: string;
  work: string;
  name: string;
  role: string;
  works: string[];
};

const PEOPLE: Person[] = [
  { img: "kid-1.jpg", work: "work-1.jpg", name: "서우진", role: "배우", works: ["하이바이, 마마", "슈룹", "구해줘 2"] },
  { img: "kid-2.jpg", work: "work-2.jpg", name: "김지율", role: "배우", works: ["트리거", "어른 사진관", "원하는 대로"] },
  { img: "kid-3.jpg", work: "work-3.jpg", name: "지유", role: "가수", works: ["KiiiKiii", "STARSHIP"] },
  { img: "kid-4.jpg", work: "work-4.jpg", name: "신서우", role: "배우", works: ["여신강림", "그린마더스클럽", "조립식 가족"] },
  { img: "kid-5.jpg", work: "work-5.jpg", name: "박성훈", role: "배우", works: ["옥탑방의 문제아들", "작은 아씨들", "비공식작전"] },
  { img: "kid-6.jpg", work: "work-6.jpg", name: "김지훈", role: "배우", works: ["열혈사제", "트윈피크", "고백부부"] },
];

// Row geometry (canvas 1080×1920).
const ROW_Y = [250, 720, 1190];
const SHOT_W = 285;
const SHOT_H = 380;
const WORK_W = 210;
const WORK_H = 380;
const TEXT_W = 340;
const ITEM_GAP = 30;

const SCREEN_LEN = 150; // frames per screen
const FADE = 14;

const Row: React.FC<{ person: Person; index: number }> = ({ person, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = 12 + index * 20;
  const s = spring({ frame: frame - appear, fps, config: { damping: 15, stiffness: 110 } });
  const slide = interpolate(s, [0, 1], [60, 0]);
  const y = ROW_Y[index];

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        height: SHOT_H,
        opacity: s,
        transform: `translateY(${slide}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: ITEM_GAP,
      }}
    >
      {/* Headshot */}
      <div
        style={{
          width: SHOT_W,
          height: SHOT_H,
          flexShrink: 0,
          borderRadius: 20,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
          border: "4px solid #fff",
        }}
      >
        <Img src={staticFile(`images/celeb/${person.img}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Work collage */}
      <div
        style={{
          width: WORK_W,
          height: WORK_H,
          flexShrink: 0,
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 10px 26px rgba(0,0,0,0.3)",
          border: "3px solid #fff",
        }}
      >
        <Img src={staticFile(`images/celeb/${person.work}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Text */}
      <div
        style={{
          width: TEXT_W,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: NOTO_SANS_KR,
            fontSize: 22,
            fontWeight: 700,
            color: PURPLE,
            background: "#fff",
            padding: "4px 18px",
            borderRadius: 999,
            marginBottom: 12,
          }}
        >
          {person.role}
        </div>
        <div style={{ fontFamily: NOTO_SANS_KR, fontSize: 56, fontWeight: 900, color: "#fff", lineHeight: 1.05 }}>
          {person.name}
        </div>
        <div style={{ height: 16 }} />
        {person.works.map((w) => (
          <div
            key={w}
            style={{
              fontFamily: NOTO_SANS_KR,
              fontSize: 27,
              fontWeight: 500,
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.55,
              whiteSpace: "nowrap",
            }}
          >
            {w}
          </div>
        ))}
      </div>
    </div>
  );
};

const Screen: React.FC<{ people: Person[] }> = ({ people }) => {
  const frame = useCurrentFrame();
  const headerO = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headerY = interpolate(frame, [0, 16], [-22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const fadeOut = interpolate(frame, [SCREEN_LEN - FADE, SCREEN_LEN], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(120% 85% at 50% 8%, #6b4a8e 0%, #4a2d6b 50%, #2f1c49 100%)",
        opacity: fadeOut,
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 86,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: headerO,
          transform: `translateY(${headerY}px)`,
        }}
      >
        <div style={{ fontFamily: NOTO_SANS_KR, fontSize: 28, fontWeight: 500, letterSpacing: 1, color: "rgba(255,255,255,0.72)" }}>
          187 성장클리닉을 다녀간
        </div>
        <div style={{ fontFamily: NOTO_SANS_KR, fontSize: 58, fontWeight: 900, letterSpacing: 1, color: "#fff", marginTop: 2 }}>
          우리 아이 스타들
        </div>
      </div>

      {people.map((p, i) => (
        <Row key={p.img} person={p} index={i} />
      ))}

      {/* Pinned logo footer (white, transparent bg) */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center", opacity: headerO }}>
        <Img src={staticFile("images/logo_white.png")} style={{ width: 420, height: "auto" }} />
      </div>
    </AbsoluteFill>
  );
};

export const CelebReel: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#2f1c49" }}>
      <Sequence durationInFrames={SCREEN_LEN}>
        <Screen people={PEOPLE.slice(0, 3)} />
      </Sequence>
      <Sequence from={SCREEN_LEN - FADE} durationInFrames={SCREEN_LEN}>
        <Screen people={PEOPLE.slice(3, 6)} />
      </Sequence>
    </AbsoluteFill>
  );
};
