// 원본 대본 싱크(KO) — 원본 footage 선형재생 + 원장님 클론음성을 원본 타이밍에 정렬.
// 같은 말이 같은 타이밍에 나와 입이 (거의) 맞음. 논문 구간(c3)은 원본 한글논문 이미지.
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence,
  staticFile, spring, useCurrentFrame, useVideoConfig, interpolate,
} from "remotion";
import { COLORS } from "../../lib/constants";
import { ensureFonts, NOTO_SANS_KR } from "../../lib/fonts";

ensureFonts();
const PURPLE = "#8B5CF6";

type Chunk = {
  id: string; start: number; end: number;
  emoji?: string; tag?: string; cap: string; hl?: string;
  hashtag?: string; kind?: "video" | "paper"; cta?: boolean;
};

// start/end = 컴포지션 프레임(@30fps), 원본 전사 타임스탬프 기반
const CHUNKS: Chunk[] = [
  { id: "c1", start: 0, end: 240, emoji: "🥛", tag: "칼슘만으론?", cap: "칼슘만으론 부족합니다", hl: "부족합니다" },
  { id: "c2", start: 240, end: 420, emoji: "⚖️", tag: "3가지 균형", cap: "호르몬·수면·영양\n세 가지 균형", hl: "균형" },
  { id: "c3", start: 420, end: 600, cap: "아르기닌이 돕는\n성장호르몬 분비", hl: "성장호르몬", hashtag: "#호르몬", kind: "paper" },
  { id: "c4", start: 600, end: 960, emoji: "🌙", tag: "마그네슘", cap: "마그네슘은 돕습니다\n깊은 수면", hl: "수면", hashtag: "#수면" },
  { id: "c5", start: 960, end: 1470, emoji: "🛡️", tag: "아연", cap: "아연은\n세포와 면역 강화", hl: "면역", hashtag: "#영양" },
  { id: "c6", start: 1470, end: 1698, emoji: "📏", tag: "꼭 확인", cap: "세 가지 성분\n꼭 확인", hl: "확인", cta: true },
];

const HEAD_TOP = "칼슘 말고";
const HEAD_MARK = "키 크는 영양제 3가지?!";
export const SUPP_SYNC_DURATION = 1698; // 56.6s

const WIN = { top: 600, left: 80, width: 920, height: 620 };
const VSCALE = 1.348;
const VW = Math.round(1080 * VSCALE);
const VH = Math.round(1920 * VSCALE);
const VTOP = -Math.round(1000 * VSCALE);
const VLEFT = Math.round(WIN.width / 2 - 540 * VSCALE);
const PWIN = { top: 300, left: 60, width: 960, height: 1080 };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const SupplementSyncKR: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let idx = 0;
  for (let i = 0; i < CHUNKS.length; i++) if (frame >= CHUNKS[i].start) idx = i;
  const ch = CHUNKS[idx];
  const local = frame - ch.start;
  const dur = ch.end - ch.start;
  const exit = interpolate(local, [dur - 8, dur], [1, 0], clamp);
  const isPaper = ch.kind === "paper";

  const tPop = spring({ frame, fps, config: { damping: 12, mass: 0.7 } });
  const tScale = interpolate(tPop, [0, 1], [0.7, 1]);
  const tOp = interpolate(frame, [0, 8], [0, 1], clamp);
  const slam = spring({ frame: frame - 6, fps, config: { damping: 13, stiffness: 220, mass: 0.6 } });
  const pillScale = 1.4 - 0.4 * slam;
  const pillOp = interpolate(frame, [6, 12], [0, 1], clamp);

  const chipPop = spring({ frame: local, fps, config: { damping: 9, mass: 0.8 } });
  const chipOp = interpolate(local, [0, 6], [0, 1], clamp) * exit;
  let tok = 0;

  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #0F6E56 0%, #0D5A47 55%, #1A3A32 100%)" }}>
      {/* 원본 footage 선형재생 (얼굴 창) — 논문 구간은 한글논문 이미지 */}
      {isPaper ? (
        <div style={{ position: "absolute", ...PWIN, borderRadius: 24, overflow: "hidden", boxShadow: "0 18px 50px rgba(0,0,0,0.45)", border: "3px solid rgba(255,255,255,0.18)", transform: `scale(${interpolate(chipPop, [0, 1], [0.94, 1])})` }}>
          <Img src={staticFile("images/supplement/paper-ko.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : (
        <div style={{ position: "absolute", ...WIN, borderRadius: 28, overflow: "hidden", boxShadow: "0 18px 50px rgba(0,0,0,0.45)", border: "3px solid rgba(255,255,255,0.18)" }}>
          <OffthreadVideo src={staticFile("videos/supp-src.mp4")} muted style={{ position: "absolute", top: VTOP, left: VLEFT, width: VW, height: VH }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 70, background: "linear-gradient(180deg, rgba(13,90,71,0.85) 0%, rgba(13,90,71,0) 100%)" }} />
        </div>
      )}

      {/* 헤더 (원본 그대로) */}
      <div style={{ position: "absolute", top: 56, left: 56, right: 56, textAlign: "center", fontFamily: NOTO_SANS_KR }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: "#fff", textShadow: "2px 2px 0 #0B4A3A, -2px 2px 0 #0B4A3A, 0 4px 16px rgba(0,0,0,0.5)", opacity: tOp, transform: `scale(${tScale})`, marginBottom: 12 }}>{HEAD_TOP}</div>
        <div style={{ opacity: pillOp, transform: `scale(${pillScale})`, lineHeight: 1.6 }}>
          <span style={{ display: "inline", background: COLORS.accent, color: COLORS.tealDarkest, fontWeight: 900, fontSize: 56, padding: "6px 14px", borderRadius: 10, WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone", boxShadow: "0 6px 20px rgba(0,0,0,0.28)" }}>{HEAD_MARK}</span>
        </div>
      </div>

      {/* 우상단 해시태그 */}
      {ch.hashtag && (
        <div style={{ position: "absolute", top: 250, right: 48, opacity: chipOp, transform: `scale(${chipPop})` }}>
          <div style={{ background: PURPLE, color: "#fff", fontFamily: NOTO_SANS_KR, fontWeight: 900, fontSize: 36, padding: "8px 22px", borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.35)" }}>{ch.hashtag}</div>
        </div>
      )}

      {/* 섹션 칩 */}
      {!isPaper && ch.tag && (
        <div style={{ position: "absolute", top: 440, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: chipOp }}>
          <div style={{ transform: `scale(${chipPop})`, display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.97)", borderRadius: 999, padding: "12px 28px", boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}>
            {ch.emoji && <span style={{ fontSize: 52 }}>{ch.emoji}</span>}
            <span style={{ fontFamily: NOTO_SANS_KR, fontSize: 40, fontWeight: 800, color: COLORS.teal }}>{ch.tag}</span>
          </div>
        </div>
      )}

      {/* 자막 — 단어 단위 팝 + 키워드 형광 */}
      <div style={{ position: "absolute", top: isPaper ? 1400 : 1280, left: 50, right: 50, textAlign: "center", fontFamily: NOTO_SANS_KR }}>
        {ch.cap.split("\n").map((line, li) => (
          <div key={li} style={{ lineHeight: 1.5 }}>
            {line.split(" ").map((w, wi) => {
              const d = 4 + tok * 4; tok++;
              const sp = spring({ frame: local - d, fps, config: { damping: 11, mass: 0.5 } });
              const op = interpolate(local, [d, d + 5], [0, 1], clamp) * exit;
              const sc = interpolate(sp, [0, 1], [0.4, 1]);
              const isHl = ch.hl != null && w === ch.hl;
              const appear = d + 2;
              const flashing = local >= appear && local < appear + 4;
              return (
                <span key={wi} style={{ display: "inline-block", marginInline: 7, fontSize: 50, fontWeight: isHl ? 900 : 800, color: isHl ? COLORS.tealDarkest : "#fff", background: isHl ? (flashing ? "#FFFFFF" : COLORS.accent) : "transparent", padding: isHl ? "0 12px" : 0, borderRadius: isHl ? 10 : 0, textShadow: isHl ? "none" : "0 3px 14px rgba(0,0,0,0.5)", opacity: op, transform: `translateY(${(1 - sp) * 34}px) scale(${sc})` }}>{w}</span>
              );
            })}
          </div>
        ))}
      </div>

      {/* CTA (마지막) */}
      {ch.cta && (
        <div style={{ position: "absolute", top: 1500, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: interpolate(local, [10, 18], [0, 1], clamp) * exit }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.kakaoYellow, color: COLORS.kakaoBrown, fontFamily: NOTO_SANS_KR, fontWeight: 800, fontSize: 36, padding: "16px 30px", borderRadius: 999, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>
            <span>💬</span><span>www.dr187growup.com</span>
          </div>
        </div>
      )}

      <div style={{ position: "absolute", top: 1790, left: 0, right: 0, textAlign: "center", fontFamily: NOTO_SANS_KR, fontSize: 30, fontWeight: 700, color: COLORS.whiteAlpha65, letterSpacing: 1 }}>
        187 성장클리닉 · 연세새봄의원
      </div>

      {/* 오디오: 배경음 + 싱크 클론 청크 6개 */}
      <Audio src={staticFile("audio/bg1.mp3")} volume={0.1} />
      {CHUNKS.map((c) => (
        <Sequence key={c.id} from={c.start}>
          <Audio src={staticFile(`audio/supp-sync/ko/${c.id}.wav`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
