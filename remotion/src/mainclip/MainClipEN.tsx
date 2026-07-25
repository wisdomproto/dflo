// English localization of "성장클리닉 진료과정" (clinic process) — full 16:9 video.
// Background = clean (text-free) source clip, warped to the English narration;
// overlays recreate the Korean on-screen graphics in English via CUES (cues.en.ts).
// Mirrors MainClipTH.tsx — only the language sources differ (cues / narration / warp plan).
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile } from "remotion";
import { ensureFonts } from "../lib/fonts";
import {
  Subtitle,
  CenterTitle,
  Watermark,
  CategoryChip,
  CircleKeyword,
  SectionNumber,
  PosLabel,
  Callout,
  QCard,
  QTopBar,
  ClosingCTAEn,
} from "./overlays";
import { CUES, WATERMARK_FROM } from "./cues.en";
import type { Cue } from "./cues";
import { warpTime, NEW_TOTAL } from "./warp.en";

ensureFonts();

export const FPS = 30;
// 워프 후 새 길이 + 엔딩 CTA 카드 꼬리(5s)
export const MAINCLIP_EN_DURATION = Math.round((NEW_TOTAL + 5) * FPS);

const sec = (s: number) => Math.round(s * FPS);

function renderCue(c: Cue, i: number) {
  // 큐 시간(원본 타임라인) → 영어 워프 타임라인
  const from = sec(warpTime(c.from));
  const dur = Math.max(1, sec(warpTime(c.to)) - from);
  let inner: React.ReactNode = null;
  switch (c.kind) {
    case "subtitle":
      inner = <Subtitle lines={c.lines} tone={c.tone} />;
      break;
    case "title":
      inner = <CenterTitle parts={c.parts} fontSize={c.fontSize} y={c.y} />;
      break;
    case "chip":
      inner = <CategoryChip text={c.text} />;
      break;
    case "circle":
      inner = (
        <CircleKeyword
          text={c.text}
          xPct={c.xPct}
          yPct={c.yPct}
          fontSize={c.fontSize}
          delay={c.delay}
        />
      );
      break;
    case "number":
      inner = <SectionNumber value={c.value} xPct={c.xPct} yPct={c.yPct} size={c.size} />;
      break;
    case "label":
      inner = (
        <PosLabel
          text={c.text}
          xPct={c.xPct}
          yPct={c.yPct}
          fontSize={c.fontSize}
          align={c.align}
          color={c.color}
          outline={c.outline}
          width={c.width}
        />
      );
      break;
    case "qcard":
      inner = <QCard lines={c.lines} color={c.color} />;
      break;
    case "qbar":
      inner = <QTopBar text={c.text} />;
      break;
    case "callout":
      inner = (
        <Callout
          top={c.top}
          bottom={c.bottom}
          xPct={c.xPct}
          yPct={c.yPct}
          align={c.align}
          bottomSize={c.bottomSize}
          topSize={c.topSize}
          color={c.color}
          banner={c.banner}
          bannerW={c.bannerW}
          bannerH={c.bannerH}
          bannerBg={c.bannerBg}
          bannerTextColor={c.bannerTextColor}
        />
      );
      break;
  }
  return (
    <Sequence key={i} from={from} durationInFrames={dur}>
      {inner}
    </Sequence>
  );
}

export const MainClipEN: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 영어 나레이션 기준 워프 영상 + 영어 더빙. 큐는 warpTime(en)으로 재타이밍. */}
      <OffthreadVideo src={staticFile("mainclip/warped-clean-en.mp4")} muted />
      <Audio src={staticFile("audio/mainclip/en-narration-warped.wav")} />

      <Sequence from={sec(warpTime(WATERMARK_FROM))}>
        <Watermark />
      </Sequence>

      {CUES.map(renderCue)}

      {/* 엔딩 CTA: 한국어 "네이버에 187 검색" 아웃트로 대체(영어권엔 무의미). */}
      <Sequence from={sec(NEW_TOTAL)}>
        <ClosingCTAEn />
      </Sequence>
    </AbsoluteFill>
  );
};
