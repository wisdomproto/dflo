// 태국어 충실판 v3 — 나레이션 구동(타이밍은 src/data/supp-sync-th.json 자동 import).
// 각 구간을 태국어 음성 길이만큼, 원본 footage를 그 길이에 맞춰 재생 → 공백 0, 길이 일치.
// 음성: loudnorm(음량 균일) + stability 0.8(억양 안정). 풀스크린 + 원본 충실 자막 + 영어자막 그대로.
import {
  AbsoluteFill, Audio, OffthreadVideo, Sequence,
  staticFile, spring, useCurrentFrame, useVideoConfig, interpolate,
} from "remotion";
import { COLORS } from "../../lib/constants";
import { ensureFonts, NOTO_SANS_KR } from "../../lib/fonts";
import TIMING from "../../data/supp-sync-th.json";

ensureFonts();
const YELLOW = "#FCE61A";
const PURPLE = "#8B5CF6";
const HEAD_TOP = "ไม่ใช่แค่แคลเซียม";
const HEAD_MARK = "เพิ่มความสูง 3 อย่าง?!";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const stroke = "2px 2px 6px rgba(0,0,0,0.85), 0 0 14px rgba(0,0,0,0.6)";

type Cap = { label?: string; box?: string; lines?: string[]; hlWord?: string; hashtag?: string };
const CAPTIONS: Record<string, Cap> = {
  c1: { lines: ["ค้นหาเพิ่มความสูง", "เจอแต่ แคลเซียม?"], hlWord: "แคลเซียม?" },
  c2: { lines: ["ฮอร์โมน · การนอน · โภชนาการ", "สมดุล 3 อย่าง"] },
  c3: { label: "อย่างที่ 1", box: "อาร์จินีน", hashtag: "#ฮอร์โมน" },
  c4: { label: "อย่างที่ 2", box: "แมกนีเซียม", hashtag: "#การนอน" },
  c5: { label: "อย่างที่ 3", box: "สังกะสี", hashtag: "#โภชนาการ" },
  c6: { lines: ["ต้องมีครบทั้ง 3", "อาร์จินีน แมกนีเซียม สังกะสี"] },
};

type Chunk = { id: string; durFrames: number; origStartF: number; rate: number } & Cap;
const CHUNKS: Chunk[] = (TIMING as { id: string; durFrames: number; origStartF: number; rate: number }[])
  .map((t) => ({ ...t, ...CAPTIONS[t.id] }));

const FROM: number[] = [];
CHUNKS.forEach((c, i) => { FROM[i] = i === 0 ? 0 : FROM[i - 1] + CHUNKS[i - 1].durFrames; });
export const SUPP_FAITHFUL_TH_DURATION = CHUNKS.reduce((n, c) => n + c.durFrames, 0);

const Caption: React.FC<{ c: Chunk }> = ({ c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(frame, [c.durFrames - 8, c.durFrames], [1, 0], clamp);
  const pop = spring({ frame, fps, config: { damping: 11, mass: 0.6 } });
  const scale = interpolate(pop, [0, 1], [0.6, 1]);
  const op = interpolate(frame, [0, 6], [0, 1], clamp) * exit;
  return (
    <>
      {c.hashtag && (
        <div style={{ position: "absolute", top: 256, right: 44, opacity: op, transform: `scale(${pop})` }}>
          <div style={{ background: PURPLE, color: "#fff", fontFamily: NOTO_SANS_KR, fontWeight: 900, fontSize: 38, padding: "8px 22px", borderRadius: 10, boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }}>{c.hashtag}</div>
        </div>
      )}
      <div style={{ position: "absolute", top: 340, left: 40, right: 40, textAlign: "center", fontFamily: NOTO_SANS_KR, opacity: op, transform: `scale(${scale})` }}>
        {c.box ? (
          <>
            {c.label && <div style={{ fontSize: 50, fontWeight: 800, color: "#fff", textShadow: stroke, marginBottom: 18 }}>{c.label}</div>}
            <div style={{ display: "inline-block", border: "5px solid #fff", borderRadius: 18, padding: "8px 30px", fontSize: 66, fontWeight: 900, color: "#fff", textShadow: stroke, boxShadow: "0 6px 22px rgba(0,0,0,0.5)" }}>{c.box}</div>
          </>
        ) : (
          c.lines?.map((ln, i) => (
            <div key={i} style={{ fontSize: 54, fontWeight: 900, lineHeight: 1.45, textShadow: stroke }}>
              {ln.split(" ").map((w, wi) => (
                <span key={wi} style={{ color: c.hlWord && w === c.hlWord ? YELLOW : "#fff", marginInline: 5 }}>{w}</span>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
};

export const SupplementFaithfulTH: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tPop = spring({ frame, fps, config: { damping: 12, mass: 0.7 } });
  const tScale = interpolate(tPop, [0, 1], [0.7, 1]);
  const tOp = interpolate(frame, [0, 8], [0, 1], clamp);
  const slam = spring({ frame: frame - 6, fps, config: { damping: 13, stiffness: 220, mass: 0.6 } });
  const markScale = 1.35 - 0.35 * slam;
  const markOp = interpolate(frame, [6, 12], [0, 1], clamp);
  const total = SUPP_FAITHFUL_TH_DURATION;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 립싱크된 원장님 영상 (footage 레이어를 LatentSync로 입 맞춘 것) — 선형 재생, framing 베이크됨 */}
      <OffthreadVideo src={staticFile("videos/supp-lipsync-th.mp4")} muted style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 960, background: "linear-gradient(180deg, rgba(8,9,11,1) 0%, rgba(8,9,11,1) 80%, rgba(8,9,11,0) 100%)" }} />

      <div style={{ position: "absolute", top: 58, left: 40, right: 40, textAlign: "center", fontFamily: NOTO_SANS_KR }}>
        <div style={{ fontSize: 60, fontWeight: 900, color: "#fff", textShadow: stroke, opacity: tOp, transform: `scale(${tScale})`, marginBottom: 14 }}>{HEAD_TOP}</div>
        <div style={{ opacity: markOp, transform: `scale(${markScale})`, lineHeight: 1.55 }}>
          <span style={{ display: "inline", background: YELLOW, color: "#111", fontWeight: 900, fontSize: 68, padding: "6px 16px", borderRadius: 8, WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" }}>{HEAD_MARK}</span>
        </div>
      </div>

      {CHUNKS.map((c, i) => (
        <Sequence key={"c" + c.id} from={FROM[i]} durationInFrames={c.durFrames}>
          <Caption c={c} />
        </Sequence>
      ))}

      {/* 배경음악 — 마지막 1초 페이드아웃 */}
      <Audio src={staticFile("audio/bg1.mp3")} volume={(f) => interpolate(f, [0, 20, total - 30, total], [0, 0.08, 0.08, 0], clamp)} />
      {CHUNKS.map((c, i) => (
        <Sequence key={"a" + c.id} from={FROM[i]}>
          <Audio src={staticFile(`audio/supp-sync/th/${c.id}.wav`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// 립싱크 입력용 — footage 레이어만 (오버레이·오디오 없음). 최종 framing(104% 줌) 그대로.
export const SupplementFootageTH: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {CHUNKS.map((c, i) => (
      <Sequence key={c.id} from={FROM[i]} durationInFrames={c.durFrames}>
        <OffthreadVideo src={staticFile("videos/supp-src.mp4")} muted startFrom={c.origStartF} playbackRate={c.rate} style={{ position: "absolute", width: "104%", height: "104%", left: "-2%", top: "-2%", objectFit: "cover" }} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
