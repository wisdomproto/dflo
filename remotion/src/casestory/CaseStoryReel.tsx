// 치료사례 스토리 릴스 — 시윤 「되돌린 뼈나이」 (비식별, 9:16, 30fps)
// 6비트: 훅 / 다방면(검사신호+생활관리) / 스퍼트 / 뼈나이 역전 / 결과 / CTA.
// 디자인 리뷰 반영(2026-06-29): 깊이 배경(라이트+blob+grain), 타이포 위계, floor shadow, 토큰 통일,
//   코랄→로즈/노랑 톤다운, 빈공간 메우기, SVG area fill. ★일러스트 매트3D 통일은 에셋 재생성 대기.
// 용어: "달력"→"실제 나이". 오디오는 ffmpeg mux(컴포넌트 외부).
import React from "react";
import {
  AbsoluteFill, Sequence, Img, staticFile, useCurrentFrame, useVideoConfig,
  interpolate, spring, Easing,
} from "remotion";
import { PRETENDARD, ensureFonts } from "../lib/fonts";

const KR = PRETENDARD;
const INK = "#241d4a";
const YELLOW = "#FFCE3C";
const MINT = "#3DD9A6";
const ROSE = "#F0708A";
const SH = "0 8px 24px rgba(30,15,60,.30)";                                  // 떠있는 요소
const SHC = "0 10px 28px rgba(30,15,60,.22), 0 1px 2px rgba(0,0,0,.05)";     // 카드
const GLASS: React.CSSProperties = { background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.28)", boxShadow: "0 8px 32px rgba(20,10,50,.25), inset 0 1px 0 rgba(255,255,255,.35)" };

// 비트 길이 = 나레이션 청크 + 여유. (timing: b1 7.77 b2 11.17 b3 4.17 b4 9.95 b5 11.34 b6 4.4)
export const CS_BEATS = { b1: 255, b2: 349, b3: 128, b4: 313, b5: 374, b6: 167 };
const STARTS = (() => {
  const ids = ["b1", "b2", "b3", "b4", "b5", "b6"] as const;
  let acc = 0; const o: Record<string, number> = {};
  for (const id of ids) { o[id] = acc; acc += (CS_BEATS as any)[id]; }
  return o;
})();
export const CASE_STORY_DURATION = Object.values(CS_BEATS).reduce((a, b) => a + b, 0);

const TONES: Record<string, [string, string]> = {
  b1: ["#5b6fe0", "#7b4fb0"], b2: ["#5566d8", "#6f49a8"], b3: ["#5566d8", "#6f49a8"],
  b4: ["#4f5fc8", "#6a3f9c"], b5: ["#5b6fe0", "#7b4fb0"], b6: ["#6657c8", "#8a5fb8"],
};

// ── 깊이 배경 시스템: 그라디언트 + radial light + blurred blobs + grain ──
const Grain: React.FC = () => (
  <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.1 }}>
    <svg width="100%" height="100%" preserveAspectRatio="none">
      <filter id="csgrain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" /></filter>
      <rect width="100%" height="100%" filter="url(#csgrain)" />
    </svg>
  </AbsoluteFill>
);
const Bg: React.FC<{ tone: [string, string]; seed?: number }> = ({ tone, seed = 0 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(135deg, ${tone[0]}, ${tone[1]})` }}>
    <div style={{ position: "absolute", left: -180 + seed * 40, top: -140 + seed * 16, width: 640, height: 640, borderRadius: "50%", background: "rgba(158,128,242,.40)", filter: "blur(95px)" }} />
    <div style={{ position: "absolute", right: -200, bottom: -180 + seed * 22, width: 680, height: 680, borderRadius: "50%", background: "rgba(72,212,172,.20)", filter: "blur(110px)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 95% 58% at 50% 26%, rgba(255,255,255,.15), transparent 62%)" }} />
    <Grain />
  </AbsoluteFill>
);
const Floor: React.FC<{ w: number; bottom: number; left?: string; tx?: string }> = ({ w, bottom, left = "50%", tx = "-50%" }) => (
  <div style={{ position: "absolute", bottom, left, width: w, height: w * 0.16, transform: `translateX(${tx})`, background: "radial-gradient(ellipse, rgba(12,6,30,.45), transparent 70%)", filter: "blur(10px)" }} />
);

const sIn = (f: number, fps: number, delay = 0, cfg = { damping: 200, mass: 0.7 }) => spring({ frame: f - delay, fps, config: cfg });
const shadow = "0 4px 24px rgba(20,10,50,.4)";
const kicker: React.CSSProperties = { fontSize: 32, fontWeight: 600, letterSpacing: ".03em", color: "rgba(255,255,255,.66)" };
const numStyle = (size: number, color: string): React.CSSProperties => ({ fontSize: size, fontWeight: 900, letterSpacing: "-0.03em", color, lineHeight: 1.0, textShadow: shadow });

const CountUp: React.FC<{ from: number; to: number; f: number; start: number; dur: number; suffix?: string; digits?: number; style?: React.CSSProperties }> =
  ({ from, to, f, start, dur, suffix = "", digits = 1, style }) => {
    const v = interpolate(f, [start, start + dur], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    return <span style={style}>{v.toFixed(digits)}{suffix}</span>;
  };

const Disclaimer: React.FC<{ bottom?: number }> = ({ bottom = 40 }) => (
  <div style={{ position: "absolute", bottom, left: 80, right: 80, textAlign: "center", background: "rgba(16,9,36,.58)", borderRadius: 20, padding: "11px 18px" }}>
    <span style={{ fontSize: 24, fontWeight: 500, color: "rgba(255,255,255,.88)" }}>한 환자의 치료 사례이며, 결과는 개인차가 있습니다.</span>
  </div>
);

// ── ① 훅 ──
const Beat1: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const boy = sIn(f, fps, 6);
  const t1 = sIn(f, fps, 14); const t2 = sIn(f, fps, 26); const t3 = sIn(f, fps, 40);
  const chip = sIn(f, fps, 64);
  return (
    <AbsoluteFill style={{ fontFamily: KR }}>
      <Bg tone={TONES.b1} seed={0} />
      {/* 중앙 헤일로(빈공간 채움 + 소년 접지감) */}
      <div style={{ position: "absolute", bottom: 150, left: "50%", transform: "translateX(-50%)", width: 760, height: 760, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.10), transparent 64%)" }} />
      <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center", padding: "0 70px" }}>
        <div style={{ ...kicker, fontSize: 50, color: "rgba(255,255,255,.82)", opacity: t1, transform: `translateY(${(1 - t1) * 22}px)` }}>뼈나이가 실제 나이보다</div>
        <div style={{ ...numStyle(120, YELLOW), marginTop: 10, opacity: t2, transform: `scale(${0.82 + t2 * 0.18})`, textShadow: "0 0 44px rgba(255,206,60,.4), " + shadow }}>2년 가까이</div>
        <div style={{ fontSize: 64, fontWeight: 700, color: "#fff", marginTop: 6, opacity: t3, textShadow: shadow }}>빨랐습니다</div>
      </div>
      <Floor w={300} bottom={172} />
      <Img src={staticFile("casestory/boy-before.png")}
        style={{ position: "absolute", bottom: 180, left: "50%", height: 860, transform: `translateX(-50%) translateY(${(1 - boy) * 60}px)`, opacity: boy, filter: "drop-shadow(0 20px 28px rgba(0,0,0,.28))" }} />
      <div style={{ position: "absolute", bottom: 110, width: "100%", textAlign: "center", opacity: chip, transform: `translateY(${(1 - chip) * 20}px)` }}>
        <span style={{ ...GLASS, color: "#fff", fontSize: 38, fontWeight: 600, padding: "16px 40px", borderRadius: 50, display: "inline-block" }}>
          만 11세 · 첫 예상키 <b style={{ color: YELLOW, fontWeight: 800 }}>167.6cm</b>
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── ② 다방면: 검사 신호(3) + 생활 관리(2) ──
const SIG = [{ img: "signal-iron.png", label: "철분" }, { img: "signal-hormone.png", label: "사춘기 호르몬" }, { img: "signal-thyroid.png", label: "갑상선" }];
const CARE = [{ img: "signal-diet.png", label: "식단" }, { img: "signal-sleep.png", label: "수면" }];
const Card: React.FC<{ s: { img: string; label: string }; f: number; fps: number; delay: number; check: boolean }> = ({ s, f, fps, delay, check }) => {
  const p = sIn(f, fps, delay, { damping: 14, mass: 0.6 });
  const ck = sIn(f, fps, delay + 30, { damping: 12, mass: 0.5 });
  return (
    <div style={{ width: 286, background: "linear-gradient(160deg,#fdfcff,#f3f0fb)", border: "1px solid rgba(106,75,176,.1)", borderRadius: 32, padding: "20px 12px 14px", boxShadow: SHC, textAlign: "center", position: "relative", transform: `scale(${0.4 + p * 0.6})`, opacity: Math.min(1, p * 1.4) }}>
      <Img src={staticFile("casestory/" + s.img)} style={{ width: 158, height: 158, objectFit: "contain", margin: "0 auto", display: "block" }} />
      <div style={{ fontSize: 32, fontWeight: 800, color: INK, marginTop: 4 }}>{s.label}</div>
      {check && (
        <div style={{ position: "absolute", top: 14, right: 14, width: 46, height: 46, borderRadius: 30, background: MINT, color: "#fff", fontSize: 28, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ck})`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)" }}>✓</div>
      )}
    </div>
  );
};
const Beat2: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const title = sIn(f, fps, 4); const g1 = sIn(f, fps, 12); const g2 = sIn(f, fps, 150);
  return (
    <AbsoluteFill style={{ fontFamily: KR }}>
      <Bg tone={TONES.b2} seed={1} />
      <div style={{ position: "absolute", top: 130, width: "100%", textAlign: "center", fontSize: 66, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", opacity: title, transform: `translateY(${(1 - title) * 18}px)`, textShadow: shadow }}>원인을 하나씩 잡았습니다</div>
      <div style={{ position: "absolute", top: 310, width: "100%", textAlign: "center", fontSize: 34, fontWeight: 700, color: "rgba(255,255,255,.8)", opacity: g1 }}>🩺 검사로 찾은 신호</div>
      <div style={{ position: "absolute", top: 372, width: "100%", display: "flex", gap: 22, justifyContent: "center", padding: "0 44px" }}>
        {SIG.map((s, i) => <Card key={s.img} s={s} f={f} fps={fps} delay={14 + i * 44} check />)}
      </div>
      <div style={{ position: "absolute", top: 738, width: "100%", textAlign: "center", fontSize: 34, fontWeight: 700, color: "rgba(255,255,255,.8)", opacity: g2 }}>🌙 생활 관리</div>
      <div style={{ position: "absolute", top: 800, width: "100%", display: "flex", gap: 22, justifyContent: "center" }}>
        {CARE.map((s, i) => <Card key={s.img} s={s} f={f} fps={fps} delay={156 + i * 28} check={false} />)}
      </div>
    </AbsoluteFill>
  );
};

// ── ③ 스퍼트 (차트 격상: area fill + grid + glow) ──
const Beat3: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const draw = interpolate(f, [8, 64], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const fill = interpolate(f, [40, 78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cap = sIn(f, fps, 60); const labs = interpolate(f, [44, 74], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const path = "M 90 410 C 250 396, 370 378, 480 326 C 575 282, 650 168, 808 92";
  const area = path + " L 808 410 L 90 410 Z";
  return (
    <AbsoluteFill style={{ fontFamily: KR }}>
      <Bg tone={TONES.b3} seed={2} />
      <div style={{ position: "absolute", top: 200, width: "100%", textAlign: "center", fontSize: 56, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", textShadow: shadow }}>신호가 잡히자, 키가 답했습니다</div>
      <svg viewBox="0 0 900 470" style={{ position: "absolute", top: 400, left: "50%", transform: "translateX(-50%)", width: 900 }}>
        <defs>
          <linearGradient id="csarea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={YELLOW} stopOpacity="0.28" /><stop offset="1" stopColor={YELLOW} stopOpacity="0" /></linearGradient>
        </defs>
        {/* grid */}
        {[150, 290, 430, 570, 710].map((x) => <line key={x} x1={x} y1="70" x2={x} y2="410" stroke="rgba(255,255,255,.08)" strokeWidth="2" strokeDasharray="4 8" />)}
        <line x1="90" y1="410" x2="850" y2="410" stroke="rgba(255,255,255,.25)" strokeWidth="3" />
        <path d={area} fill="url(#csarea)" opacity={fill} />
        <path d={path} fill="none" stroke={YELLOW} strokeWidth="11" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={draw} />
        <circle cx="808" cy="92" r="16" fill="#fff" opacity={interpolate(f, [58, 70], [0, 1], { extrapolateRight: "clamp" })} style={{ filter: "drop-shadow(0 0 16px rgba(255,206,60,.8))" }} />
        <g opacity={labs} fill="rgba(255,255,255,.7)" fontFamily="Pretendard, sans-serif"><circle cx="90" cy="410" r="9" fill="#fff" /><text x="74" y="455" fontSize="27" fontWeight="600">치료 시작</text></g>
      </svg>
      <div style={{ position: "absolute", top: 1010, width: "100%", textAlign: "center", opacity: cap, transform: `scale(${0.72 + cap * 0.28})` }}>
        <div style={numStyle(128, YELLOW)}>약 +7cm</div>
        <div style={{ fontSize: 46, fontWeight: 600, color: "rgba(255,255,255,.8)", marginTop: 6 }}>단 반 년 만에</div>
      </div>
    </AbsoluteFill>
  );
};

// ── ④ 뼈나이 역전 (뼈나이 vs 실제 나이 시각 비교) ──
const AgeRow: React.FC<{ tag: string; tagColor: string; boneAhead: boolean; realSub: string; boneSub: string; boneColor: string; gapText: string; f: number; fps: number; delay: number }> =
  ({ tag, tagColor, boneAhead, realSub, boneSub, boneColor, gapText, f, fps, delay }) => {
    const p = sIn(f, fps, delay, { damping: 16, mass: 0.7 });
    const realPct = boneAhead ? 24 : 78;
    const bonePct = boneAhead ? 78 : 24;
    const Marker: React.FC<{ pct: number; name: string; sub: string; color: string }> = ({ pct, name, sub, color }) => (
      <div style={{ position: "absolute", left: `${pct}%`, top: 52, transform: "translateX(-50%)", textAlign: "center", width: 220 }}>
        <div style={{ width: 32, height: 32, borderRadius: 20, background: color, margin: "0 auto", boxShadow: "0 2px 8px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.45)" }} />
        <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", marginTop: 10 }}>{name}</div>
        <div style={{ fontSize: 25, fontWeight: 600, color: "rgba(255,255,255,.6)" }}>{sub}</div>
      </div>
    );
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, justifyContent: "center", opacity: p, transform: `translateY(${(1 - p) * 18}px)` }}>
        <div style={{ background: tagColor, color: "#fff", fontSize: 30, fontWeight: 800, padding: "10px 22px", borderRadius: 16, marginTop: 40 }}>{tag}</div>
        <div style={{ position: "relative", width: 600, height: 168 }}>
          <div style={{ position: "absolute", top: 68, left: 20, right: 20, height: 5, borderRadius: 3, background: "rgba(255,255,255,.22)" }} />
          <div style={{ position: "absolute", top: 2, left: "51%", transform: "translateX(-50%)", background: boneColor, color: "#16122b", fontSize: 28, fontWeight: 900, padding: "6px 20px", borderRadius: 20, whiteSpace: "nowrap", boxShadow: SH }}>{gapText}</div>
          <Marker pct={realPct} name="실제 나이" sub={realSub} color="#ffffff" />
          <Marker pct={bonePct} name="뼈나이" sub={boneSub} color={boneColor} />
        </div>
      </div>
    );
  };
const Beat4: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const title = sIn(f, fps, 4); const mid = sIn(f, fps, 118); const bottom = sIn(f, fps, 235);
  return (
    <AbsoluteFill style={{ fontFamily: KR }}>
      <Bg tone={TONES.b4} seed={3} />
      <div style={{ position: "absolute", top: 140, width: "100%", textAlign: "center", opacity: title }}>
        <div style={{ ...kicker, fontSize: 36 }}>가장 큰 변화</div>
        <div style={{ fontSize: 66, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", textShadow: shadow, marginTop: 4 }}>뼈나이를 되돌렸습니다</div>
      </div>
      <div style={{ position: "absolute", top: 400, width: "100%" }}>
        <AgeRow tag="초진" tagColor="rgba(240,112,138,.92)" boneAhead realSub="만 11세" boneSub="13세 수준" boneColor={ROSE} gapText="뼈나이 2년 빠름" f={f} fps={fps} delay={30} />
      </div>
      <div style={{ position: "absolute", top: 632, width: "100%", textAlign: "center", opacity: mid }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", fontSize: 30, fontWeight: 700, padding: "8px 26px", borderRadius: 30 }}>관리 후 ↓</span>
      </div>
      <div style={{ position: "absolute", top: 730, width: "100%" }}>
        <AgeRow tag="지금" tagColor="rgba(61,217,166,.92)" boneAhead={false} realSub="만 14세" boneSub="12세 수준" boneColor={MINT} gapText="뼈나이 2살 어림" f={f} fps={fps} delay={150} />
      </div>
      <div style={{ position: "absolute", top: 1090, width: "100%", textAlign: "center", fontSize: 50, fontWeight: 800, color: "#fff", opacity: bottom, transform: `scale(${0.92 + bottom * 0.08})`, textShadow: shadow }}>자랄 시간을 그만큼 되찾았습니다</div>
    </AbsoluteFill>
  );
};

// ── ⑤ 결과 ──
const Beat5: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const boy = sIn(f, fps, 10); const h = sIn(f, fps, 20); const pah = sIn(f, fps, 90); const close = sIn(f, fps, 250);
  return (
    <AbsoluteFill style={{ fontFamily: KR }}>
      <Bg tone={TONES.b5} seed={4} />
      <Floor w={420} bottom={20} left="74%" tx="-50%" />
      <Img src={staticFile("casestory/boy-after.png")}
        style={{ position: "absolute", bottom: 0, right: -40, height: 980, opacity: boy, transform: `translateY(${(1 - boy) * 50}px)`, filter: "drop-shadow(0 20px 28px rgba(0,0,0,.28))" }} />
      <div style={{ position: "absolute", top: 158, left: 72, opacity: h, transform: `translateY(${(1 - h) * 20}px)` }}>
        <div style={{ ...kicker }}>만 14세 반, 지금 키</div>
        <div style={numStyle(126, "#fff")}><CountUp from={150} to={173.5} f={f} start={20} dur={40} suffix="cm" /></div>
      </div>
      <div style={{ position: "absolute", top: 458, left: 72, width: 600, ...GLASS, borderRadius: 34, padding: "28px 34px", opacity: pah, transform: `translateY(${(1 - pah) * 24}px)` }}>
        <div style={{ ...kicker, fontSize: 36 }}>예상 성인키</div>
        <div style={{ fontSize: 52, fontWeight: 700, color: "rgba(255,255,255,.55)", textDecoration: "line-through" }}>167.6cm</div>
        <div style={numStyle(102, YELLOW)}><CountUp from={167.6} to={188.5} f={f} start={100} dur={45} suffix="cm" /></div>
        <div style={{ display: "inline-block", marginTop: 12, background: MINT, color: "#053a29", fontSize: 38, fontWeight: 900, padding: "8px 26px", borderRadius: 40, boxShadow: SH }}>+20cm 넘게 ↑</div>
      </div>
      <div style={{ position: "absolute", bottom: 150, left: 72, width: 660, fontSize: 46, fontWeight: 800, color: "#fff", opacity: close, textShadow: shadow }}>시윤이는, 지금도 자라고 있습니다</div>
      <Disclaimer />
    </AbsoluteFill>
  );
};

// ── ⑥ CTA (미니멀·수직 중앙) ──
const Beat6: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const logo = sIn(f, fps, 6); const line = sIn(f, fps, 24); const url = sIn(f, fps, 44);
  const pulse = 1 + Math.sin(f / 6) * 0.04;
  return (
    <AbsoluteFill style={{ fontFamily: KR }}>
      <Bg tone={TONES.b6} seed={5} />
      <Img src={staticFile("images/logo_en_wh.png")} style={{ position: "absolute", top: 620, left: "50%", width: 470, objectFit: "contain", transform: `translateX(-50%) translateY(${(1 - logo) * 20}px)`, opacity: logo }} />
      <div style={{ position: "absolute", top: 850, width: "100%", textAlign: "center", fontSize: 66, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", opacity: line, transform: `scale(${0.92 + line * 0.08})`, textShadow: shadow }}>더 많은 치료사례</div>
      <div style={{ position: "absolute", top: 944, width: "100%", textAlign: "center", fontSize: 40, fontWeight: 600, color: "rgba(255,255,255,.8)", opacity: line }}>지금 홈페이지에서 확인하세요</div>
      <div style={{ position: "absolute", top: 1080, width: "100%", textAlign: "center", opacity: url }}>
        <span style={{ display: "inline-block", background: YELLOW, color: "#4a2c8f", fontFamily: "Inter, sans-serif", fontSize: 46, fontWeight: 900, padding: "20px 56px", borderRadius: 60, transform: `scale(${pulse})`, boxShadow: "0 16px 40px rgba(30,15,60,.4)" }}>dr187growup.com</span>
      </div>
      <Disclaimer bottom={150} />
    </AbsoluteFill>
  );
};

export const CaseStoryReel: React.FC = () => {
  ensureFonts();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={CS_BEATS.b1}><Beat1 /></Sequence>
      <Sequence from={STARTS.b2} durationInFrames={CS_BEATS.b2}><Beat2 /></Sequence>
      <Sequence from={STARTS.b3} durationInFrames={CS_BEATS.b3}><Beat3 /></Sequence>
      <Sequence from={STARTS.b4} durationInFrames={CS_BEATS.b4}><Beat4 /></Sequence>
      <Sequence from={STARTS.b5} durationInFrames={CS_BEATS.b5}><Beat5 /></Sequence>
      <Sequence from={STARTS.b6} durationInFrames={CS_BEATS.b6}><Beat6 /></Sequence>
    </AbsoluteFill>
  );
};
