// Thai localization of "성장클리닉 진료과정" (clinic process) — full 16:9 video.
// Background = clean (text-free) source clip; overlays recreate the Korean
// on-screen graphics in Thai. Built / confirmed cut-by-cut via CUES.
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
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
} from "./overlays";
import { CUES, WATERMARK_FROM, type Cue } from "./cues";

ensureFonts();

export const FPS = 30;
export const MAINCLIP_DURATION = 7360; // 245.33s @ 30fps

const sec = (s: number) => Math.round(s * FPS);

function renderCue(c: Cue, i: number) {
  const from = sec(c.from);
  const dur = Math.max(1, sec(c.to) - from);
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
      inner = (
        <SectionNumber value={c.value} xPct={c.xPct} yPct={c.yPct} size={c.size} />
      );
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
          color={c.color}
          banner={c.banner}
          bannerW={c.bannerW}
          bannerH={c.bannerH}
          bannerBg={c.bannerBg}
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

export const MainClipTH: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("mainclip/clean.mp4")} />

      <Sequence from={sec(WATERMARK_FROM)}>
        <Watermark />
      </Sequence>

      {CUES.map(renderCue)}
    </AbsoluteFill>
  );
};
