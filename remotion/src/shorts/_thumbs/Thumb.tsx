// 제네릭 인스타 릴스 커버(썸네일) — (n, lang) 입력으로 thumbs.json 보고 렌더.
// 1080×1920(9:16). ★고정 슬롯 레이아웃: kicker/subject/number/numLabel/tagline 각 존의
//   위치·높이를 고정하고, 텍스트 길이에 맞춰 폰트만 자동 축소(존 폭에 맞춤) → 62×6 전부 동일 정렬.
// 핵심 요소·로고는 중앙 3:4 안전영역(y240~1680)에 — 인스타 프로필 그리드 크롭 대비. 원장 얼굴 없음.
import { AbsoluteFill, Img, staticFile, delayRender, continueRender } from "remotion";
import { useState, useEffect } from "react";
import thumbs from "./thumbs.json";
import { ensureFonts } from "../../lib/fonts";

ensureFonts();

type Copy = { kicker: string; subject: string; number: string; numLabel: string; tagline: string };
const DATA = thumbs as Record<string, { slug: string; langs: Record<string, Copy> }>;

const BG = "radial-gradient(120% 92% at 50% 36%, #6E4FB0 0%, #4A2D6B 48%, #281838 100%)";
const FONT: Record<string, string> = {
  ko: "'Noto Sans KR', sans-serif",
  th: "'Noto Sans Thai', 'Noto Sans KR', sans-serif",
  vi: "'Inter', 'Noto Sans KR', sans-serif",
  en: "'Inter', sans-serif",
  cn: "'Noto Sans SC', 'Noto Sans KR', sans-serif",
  ch: "'Noto Sans TC', 'Noto Sans KR', sans-serif",
};
const primaryFamily = (lang: string) => (FONT[lang] || FONT.en).split(",")[0].replace(/'/g, "").trim();

// 글자 폭 추정(em 단위): CJK/한글=1.0, 태국 base=0.92, 결합문자(0폭) 제외, 라틴/숫자=narrow.
function estUnits(s: string): number {
  let u = 0;
  for (const ch of String(s)) {
    const c = ch.codePointAt(0) ?? 0;
    if ((c >= 0x0e31 && c <= 0x0e3a) || (c >= 0x0e47 && c <= 0x0e4e) || (c >= 0x0300 && c <= 0x036f)) continue; // 결합문자 0폭
    const cjk = (c >= 0x3000 && c <= 0x9fff) || (c >= 0xac00 && c <= 0xd7af) || (c >= 0xf900 && c <= 0xffef);
    const thai = c >= 0x0e00 && c <= 0x0e7f;
    if (cjk) u += 1.0;
    else if (thai) u += 0.92;
    else if (ch === " ") u += 0.3;
    else if (/[0-9]/.test(ch)) u += 0.6;
    else if (ch === "%") u += 0.64;
    else u += 0.56;
  }
  return Math.max(u, 1);
}
// 고정 존 폭 w 안에 1줄로 들어가게 폰트 크기 자동 계산. 짧으면 max, 길면 축소(min 하한).
const fitFs = (s: string, max: number, min: number, w: number) =>
  Math.max(min, Math.min(max, Math.floor(w / estUnits(s))));

// 고정 슬롯(y/높이) — 모든 커버 동일. 가로 중앙 정렬.
const Zone: React.FC<{ top: number; h: number; children: React.ReactNode }> = ({ top, h, children }) => (
  <div style={{ position: "absolute", top, left: 0, right: 0, height: h, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 60px" }}>
    {children}
  </div>
);

export const Thumb: React.FC<{ n?: number; lang?: string }> = ({ n = 1, lang = "ko" }) => {
  const entry = DATA[String(n)];
  const d: Copy = (entry?.langs?.[lang] || entry?.langs?.ko) as Copy;
  const family = FONT[lang] || FONT.en;

  // 해당 언어·텍스트 글리프가 still 캡처 전에 로드되도록 강제(특히 중국어 SC/TC 온디맨드 서브셋).
  const [handle] = useState(() => delayRender(`thumb-${n}-${lang}`));
  useEffect(() => {
    const fam = primaryFamily(lang);
    const text = d ? [d.kicker, d.subject, d.number, d.numLabel, d.tagline].join(" ") : "";
    Promise.all([
      document.fonts.load(`900 80px "${fam}"`, text),
      document.fonts.load(`800 80px "${fam}"`, text),
      document.fonts.load(`700 80px "${fam}"`, text),
    ])
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!d) {
    return (
      <AbsoluteFill style={{ background: BG, alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 60, fontFamily: family }}>
        no data #{n} / {lang}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: "#281838", fontFamily: family }}>
      <AbsoluteFill style={{ background: BG }} />
      {/* 빛 글로우 (number 존 뒤) */}
      <div style={{ position: "absolute", top: 470, left: "50%", transform: "translateX(-50%)", width: 820, height: 820, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,212,191,0.30), rgba(45,212,191,0) 68%)" }} />

      {/* ── 고정 슬롯 (중앙 3:4 안전영역 내부) ── */}

      {/* kicker — coral pill */}
      <Zone top={308} h={84}>
        <span style={{ background: "#FF5A7A", color: "#fff", fontWeight: 900, fontSize: fitFs(d.kicker, 48, 26, 780), padding: "11px 36px", borderRadius: 999, letterSpacing: 0.5, boxShadow: "0 12px 30px rgba(0,0,0,0.38)", whiteSpace: "nowrap" }}>
          {d.kicker}
        </span>
      </Zone>

      {/* subject — white (주어 필수, 길면 2줄 허용) */}
      <Zone top={402} h={132}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: fitFs(d.subject, 76, 40, 920), lineHeight: 1.14, textShadow: "0 4px 20px rgba(0,0,0,0.42)" }}>
          {d.subject}
        </div>
      </Zone>

      {/* number — mint 거대 히어로 (존 폭에 맞춰 자동 축소, 1줄) */}
      <Zone top={550} h={450}>
        <span style={{ display: "inline-block", fontWeight: 900, fontSize: fitFs(d.number, 430, 58, 900), lineHeight: 1.1, letterSpacing: -6, backgroundImage: "linear-gradient(180deg,#EFFFFB 0%,#6FEEDB 44%,#2dd4bf 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 16px 34px rgba(0,0,0,0.5))", whiteSpace: "nowrap" }}>
          {d.number}
        </span>
      </Zone>

      {/* numLabel — 노랑 pill */}
      <Zone top={1034} h={120}>
        <span style={{ background: "#FCE61A", color: "#281838", fontWeight: 900, fontSize: fitFs(d.numLabel, 78, 34, 800), padding: "10px 32px", borderRadius: 16, lineHeight: 1.2, whiteSpace: "nowrap", boxShadow: "0 12px 30px rgba(0,0,0,0.3)" }}>
          {d.numLabel}
        </span>
      </Zone>

      {/* tagline — 흰색 (노랑과 충분히 띄움, 길면 2줄) */}
      <Zone top={1206} h={108}>
        <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 700, fontSize: fitFs(d.tagline, 48, 26, 900), lineHeight: 1.25 }}>
          {d.tagline}
        </div>
      </Zone>

      {/* 187 로고 (고정, 안전영역 하단) */}
      <div style={{ position: "absolute", top: 1474, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Img src={staticFile("images/logo_en_wh.png")} style={{ width: 540, height: "auto", filter: "drop-shadow(0 4px 18px rgba(0,0,0,0.55))" }} />
      </div>
    </AbsoluteFill>
  );
};
