// 원장 프레젠터 쇼츠 — 인트로 → [헤더 / 원장 라운드 카드 / 자막 / 로고] + 인포그래픽 인서트 → CTA 카드.
// videoSrc = 립싱크된 원장 "정면" 베이스(정사각 1080, 크림 배경 그대로 — RVM 매팅 없음).
// 비정면/B-roll 컷은 인서트존(c3·c4·c6·c7)에 숨겨 가린다. 우리 포맷 표준(2026-06-09 사용자 확정).
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Video, Sequence,
  spring, useCurrentFrame, useVideoConfig, interpolate, getRemotionEnvironment,
} from "remotion";
import { asset } from "../../lib/assets";
import { ensureFonts, NOTO_SANS_KR } from "../../lib/fonts";
import { ShortLogo } from "./ShortLogo";
import { StickerLayer } from "./StickerLayer";

const YELLOW = "#FCE61A";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const stroke = "2px 2px 7px rgba(0,0,0,0.92), 0 0 16px rgba(0,0,0,0.7)";

const PANEL_TOP = 300, PANEL_H = 1080;   // 정사각 영상 패널 (y300~1380)
const CAP_TOP = 1404, CAP_H = 280;       // 자막 존 (패널 아래)
const PANEL_R = 44;                      // 패널 라운드
const INTRO_F = 52;                      // 인트로 길이(프레임)
const PURPLE_BG = "linear-gradient(145deg,#7C6BF0 0%,#6A46B5 52%,#8E4FA6 100%)";

// per-locale CTA (홈페이지 + 흰 로고)
const SITE: Record<string, string> = { ko: "www.dr187growup.com", en: "www.dr187growup.com/en", th: "www.dr187growup.com/th", vi: "www.dr187growup.com/vi" };
const CTA_LOGO: Record<string, string> = { ko: "images/logo_en_wh.png", en: "images/logo_en_wh.png", th: "images/logo_en_wh.png", vi: "images/logo_en_wh.png" };

type Timing = { id: string; durFrames: number; origStartF: number; rate: number };
type Script = {
  header: Record<string, { top: string; mark: string }>;
  cta?: Record<string, string>;
  chunks: any[];
  headerStyle?: { markBg?: string; markFg?: string };
};

function hlLine(ln: string, hl?: string) {
  if (hl && ln.includes(hl)) {
    const i = ln.indexOf(hl);
    return (<>{ln.slice(0, i)}<span style={{ color: YELLOW }}>{hl}</span>{ln.slice(i + hl.length)}</>);
  }
  return <>{ln}</>;
}

// 자막 (패널 아래 자기 구역)
const CaptionZone: React.FC<{ c: any; lang: string }> = ({ c, lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines: string[] = c["cap_" + lang] || (c[lang] ? [c[lang]] : []);
  const hl: string = c["hl_" + lang] || "";
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const op = interpolate(frame, [0, 5], [0, 1], clamp) * interpolate(frame, [c.durFrames - 7, c.durFrames], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: CAP_TOP, left: 0, width: 1080, height: CAP_H, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: NOTO_SANS_KR, padding: "0 56px", opacity: op, transform: `scale(${interpolate(pop, [0, 1], [0.84, 1])})` }}>
      {lines.map((ln, k) => (
        <div key={k} style={{ fontSize: 62, fontWeight: 900, color: "#fff", lineHeight: 1.34, textShadow: stroke }}>{hlLine(ln, hl)}</div>
      ))}
    </div>
  );
};

// 인포그래픽 인서트 — 영상 패널을 교체(정사각 이미지가 정사각 패널에 딱).
// 이미지는 언어중립(텍스트 0), 텍스트는 insertLabels 로 언어별 오버레이(분수좌표 x·y, 0~1).
const InsertPanel: React.FC<{ c: any; lang: string }> = ({ c, lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const src: string = c["insert_" + lang] || c.insert;
  const op = interpolate(frame, [0, 6], [0, 1], clamp) * interpolate(frame, [c.durFrames - 6, c.durFrames], [1, 0], clamp);
  const pop = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const labels: any[] = c.insertLabels || [];
  return (
    <div style={{ position: "absolute", left: 0, top: PANEL_TOP, width: 1080, height: PANEL_H, opacity: op, borderRadius: PANEL_R, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#fdeef4,#ffffff 55%,#f3effa)" }} />
      <Img src={asset(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", transform: `scale(${interpolate(pop, [0, 1], [0.92, 1])})` }} />
      {labels.map((L, k) => {
        const txt: string = L[lang] ?? L.ko ?? "";
        if (!txt) return null;
        const d = 4 + k * 3; // 살짝 스태거 등장
        const lop = interpolate(frame, [d, d + 7], [0, 1], clamp) * interpolate(frame, [c.durFrames - 6, c.durFrames], [1, 0], clamp);
        const lpop = spring({ frame: frame - d, fps, config: { damping: 13, mass: 0.6 } });
        return (
          <div key={k} style={{
            position: "absolute", left: `${L.x * 100}%`, top: `${L.y * 100}%`,
            transform: `translate(-50%,-50%) scale(${interpolate(lpop, [0, 1], [0.7, 1], clamp)})`,
            fontFamily: NOTO_SANS_KR, fontSize: L.size ?? 40, fontWeight: L.weight ?? 800,
            color: L.color ?? "#1f2430", whiteSpace: "pre", textAlign: "center", lineHeight: 1.15, opacity: lop,
            textShadow: L.pill ? "none" : "0 2px 10px rgba(0,0,0,0.18)",
            ...(L.pill ? { background: L.pill, padding: "6px 18px", borderRadius: 14, boxShadow: "0 6px 18px rgba(0,0,0,0.12)" } : {}),
          }}>{txt}</div>
        );
      })}
    </div>
  );
};

// 인트로 카드 — 첫 ~1.7초, 보라 그라데이션 위 로고 + 훅 슬램, 끝에 위로 페이드아웃하며 본문 노출.
const IntroCard: React.FC<{ head: { top: string; mark: string }; logoSrc: string }> = ({ head, logoSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame: frame - 4, fps, config: { damping: 13, stiffness: 200, mass: 0.7 } });
  const sc = interpolate(slam, [0, 1], [1.34, 1], clamp);
  // 긴 mark 는 폰트 자동 축소(3줄 빽빽 방지). 짧으면 108 유지.
  const markFont = Math.max(60, Math.min(108, Math.floor(920 / Math.max(head.mark.length, 1))));
  const out = interpolate(frame, [INTRO_F - 12, INTRO_F], [1, 0], clamp);
  const up = interpolate(frame, [INTRO_F - 12, INTRO_F], [0, -70], clamp);
  return (
    <AbsoluteFill style={{ opacity: out, transform: `translateY(${up}px)` }}>
      <AbsoluteFill style={{ background: PURPLE_BG }} />
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: interpolate(frame, [2, 16], [0, 1], clamp) }}>
        <Img src={asset(logoSrc)} style={{ width: 300, height: "auto", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.25))" }} />
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: NOTO_SANS_KR, padding: "0 72px" }}>
        <div style={{ fontSize: 60, fontWeight: 800, color: "rgba(255,255,255,0.92)", marginBottom: 26, opacity: interpolate(frame, [6, 18], [0, 1], clamp) }}>{head.top}</div>
        <div style={{ transform: `scale(${sc})` }}>
          <div style={{ fontSize: markFont, fontWeight: 900, color: "#fff", lineHeight: 1.16, textShadow: "0 8px 34px rgba(0,0,0,0.32)" }}>{head.mark}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// CTA 카드 — 마지막 청크, 보라 그라데이션 위 큰 로고 가운데 + 홈페이지 URL + 카피.
const CTACard: React.FC<{ ctaLine?: string; logoSrc: string; url: string }> = ({ ctaLine, logoSrc, url }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 3, fps, config: { damping: 14, mass: 0.8 } });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: PURPLE_BG }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: NOTO_SANS_KR, padding: "0 80px" }}>
        {ctaLine ? <div style={{ fontSize: 54, fontWeight: 800, color: "rgba(255,255,255,0.95)", marginBottom: 44, opacity: interpolate(frame, [8, 20], [0, 1], clamp) }}>{ctaLine}</div> : null}
        <Img src={asset(logoSrc)} style={{ width: 640, height: "auto", transform: `scale(${interpolate(pop, [0, 1], [0.7, 1], clamp)})`, filter: "drop-shadow(0 12px 34px rgba(0,0,0,0.32))" }} />
        <div style={{ marginTop: 58, fontSize: 44, fontWeight: 800, color: "#fff", background: "rgba(255,255,255,0.16)", border: "2px solid rgba(255,255,255,0.55)", padding: "14px 42px", borderRadius: 999, opacity: interpolate(frame, [14, 26], [0, 1], clamp) }}>🌐 {url}</div>
      </div>
    </AbsoluteFill>
  );
};

export const presenterDuration = (timing: Timing[]) => timing.reduce((n, t) => n + t.durFrames, 0);

export const PresenterShort: React.FC<{
  script: Script; timing: Timing[]; lang: string; slug: string; videoSrc: string;
  assets?: { videoSrc: string; audio: Record<string, string> };
}> = ({ script, timing, lang, slug, videoSrc, assets }) => {
  ensureFonts(); // top-level 호출은 v4 import 시점 실행이라 환경 판정이 불안정 — 본문에서(idempotent)
  const frame = useCurrentFrame();
  const vsrc = assets?.videoSrc ?? videoSrc;
  const chunks = timing.map((t) => ({ ...t, ...(script.chunks.find((c) => c.id === t.id) || {}) }));
  const FROM: number[] = [];
  chunks.forEach((_, i) => { FROM[i] = i === 0 ? 0 : FROM[i - 1] + chunks[i - 1].durFrames; });
  const total = chunks.reduce((n, c) => n + c.durFrames, 0);
  const head = script.header[lang] || { top: "", mark: "" };
  const hs = script.headerStyle || {};
  const markBg = hs.markBg || YELLOW;
  const markFg = hs.markFg || "#111";
  const tOp = interpolate(frame, [0, 8], [0, 1], clamp);

  // CTA = 마지막 청크
  const ctaIdx = chunks.length - 1;
  const ctaFrom = FROM[ctaIdx];
  const ctaDur = chunks[ctaIdx].durFrames;
  const ctaLogo = CTA_LOGO[lang] || CTA_LOGO.en;
  const introLogo = CTA_LOGO[lang] || CTA_LOGO.en;

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#17181d,#0b0c0f)" }}>
      {/* ── 원장 라운드 카드 (립싱크 정면 베이스, 선형 재생) ── */}
      {/* Player(에디터 미리보기)는 <Video> — OffthreadVideo 는 시킹 시 빈 화면(Remotion 권장: Player=Video). 렌더·스튜디오는 OffthreadVideo 유지. */}
      <div style={{ position: "absolute", left: 0, top: PANEL_TOP, width: 1080, height: PANEL_H, borderRadius: PANEL_R, overflow: "hidden", background: "#000" }}>
        {vsrc ? (
          getRemotionEnvironment().isPlayer ? (
            <Video src={asset(vsrc)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <OffthreadVideo src={asset(vsrc)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          )
        ) : (
          <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontFamily: NOTO_SANS_KR, fontSize: 38, background: "#15161a" }}>
            영상 미생성 — 렌더 요청 시 자동 생성
          </AbsoluteFill>
        )}
      </div>

      {/* ── 인포그래픽 인서트 (패널 교체) ── */}
      {chunks.map((c, i) =>
        (c.insert || c["insert_" + lang]) ? (
          <Sequence key={"ins" + c.id} from={FROM[i]} durationInFrames={c.durFrames} layout="none">
            <InsertPanel c={c} lang={lang} />
          </Sequence>
        ) : null,
      )}

      {/* ── 헤더 (상단) ── */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: PANEL_TOP, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: NOTO_SANS_KR, padding: "0 40px" }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", textShadow: stroke, opacity: tOp, marginBottom: 16 }}>{head.top}</div>
        <div style={{ opacity: tOp, lineHeight: 1.4 }}>
          <span style={{ display: "inline", background: markBg, color: markFg, fontWeight: 900, fontSize: 66, padding: "8px 22px", borderRadius: 12, WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" }}>{head.mark}</span>
        </div>
      </div>

      {/* ── 자막 (영상 아래) — CTA 청크는 제외(카드가 덮음) ── */}
      {chunks.map((c, i) => (i === ctaIdx ? null : (
        <Sequence key={"cap" + c.id} from={FROM[i]} durationInFrames={c.durFrames} layout="none">
          <CaptionZone c={c} lang={lang} />
        </Sequence>
      )))}

      {/* ── 스티커 (인서트 위·인트로/CTA 카드 아래 = 헤더/자막과 같은 층) ── */}
      {chunks.map((c, i) => (c.stickers?.length ? (
        <Sequence key={"st" + c.id} from={FROM[i]} durationInFrames={c.durFrames} layout="none">
          <StickerLayer stickers={c.stickers} durFrames={c.durFrames} />
        </Sequence>
      ) : null))}

      <ShortLogo />

      {/* ── 인트로 카드 (맨 위 레이어) ── */}
      <Sequence from={0} durationInFrames={INTRO_F} layout="none">
        <IntroCard head={head} logoSrc={introLogo} />
      </Sequence>

      {/* ── CTA 카드 (맨 위 레이어) ── */}
      <Sequence from={ctaFrom} durationInFrames={ctaDur} layout="none">
        <CTACard ctaLine={script.cta?.[lang]} logoSrc={ctaLogo} url={SITE[lang] || SITE.en} />
      </Sequence>

      {/* ── 오디오 — 청크 오디오는 assets 있으면 명시 URL(없는 id는 스킵 — 404 <Audio> 방지) ── */}
      {/* durationInFrames 로 청크 구간만 mount: 없으면 시작한 오디오가 끝까지 안 닫혀 Player 동시 audio 태그 한도(기본 5) 초과 → 시킹 시 throw. 자막·인서트 시퀀스와 동일하게 닫는다. */}
      <Audio src={asset("audio/bg1.mp3")} volume={(f) => interpolate(f, [0, 20, total - 30, total], [0, 0.06, 0.06, 0], clamp)} />
      {chunks.map((c, i) => {
        const aSrc = assets ? assets.audio[c.id] : asset(`audio/shorts/${slug}/${lang}/${c.id}.wav`);
        return aSrc ? (
          <Sequence key={"a" + c.id} from={FROM[i]} durationInFrames={c.durFrames}>
            <Audio src={aSrc} />
          </Sequence>
        ) : null;
      })}
    </AbsoluteFill>
  );
};
