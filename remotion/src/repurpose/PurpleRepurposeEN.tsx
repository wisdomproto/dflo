import { AbsoluteFill, OffthreadVideo, Audio, staticFile, useVideoConfig, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import type { FC } from "react";
import { ensureFonts, PRETENDARD, INTER, NOTO_SANS_SC } from "../lib/fonts";

ensureFonts();

const TOP_BAND = 436;
const CENTER_H = 1044;

export type EnSub = { start: number; end: number; en: string; zh: string };

// 영어판 재배포 릴 — 영어 헤더 + 영어 TTS 더빙(원본 음소거) + 하단 EN/中(간체) 이중 자막(로고·URL 없음).
export type PurpleEnProps = {
  videoSrc: string;
  videoSec: number;
  kicker: string; // 영어
  title: string; // 영어
  audioSrc: string; // 영어 TTS 더빙 (public 상대), 없으면 무음
  subs: EnSub[]; // {start,end,en,zh} 초 단위
  bgmVolume?: number; // BGM 볼륨 (기본 0.1)
};

function Subtitles({ subs }: { subs: EnSub[] }) {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const cur = subs.find((s) => t >= s.start && t < s.end);
  if (!cur) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "0 56px", textAlign: "center" }}>
      <div style={{ color: "#fff", fontFamily: INTER, fontSize: 46, fontWeight: 700, lineHeight: 1.24, textShadow: "0 2px 12px rgba(30,15,60,0.5)" }}>{cur.en}</div>
      <div style={{ color: "rgba(255,255,255,0.9)", fontFamily: NOTO_SANS_SC, fontSize: 42, fontWeight: 500, lineHeight: 1.28 }}>{cur.zh}</div>
    </div>
  );
}

export const PurpleRepurposeEN: FC<PurpleEnProps> = ({ videoSrc, kicker, title, audioSrc, subs, bgmVolume = 0.1 }) => {
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #8461DE 0%, #7A54D0 52%, #6E45B6 100%)", fontFamily: PRETENDARD }}>
      {/* 중앙 영상 — 음소거 (영어 TTS 로 대체) */}
      <div style={{ position: "absolute", top: TOP_BAND, left: 0, width: 1080, height: CENTER_H, overflow: "hidden" }}>
        <OffthreadVideo src={staticFile(videoSrc)} muted style={{ width: 1080, height: CENTER_H, objectFit: "cover" }} />
      </div>

      {/* BGM (더빙 음성 아래) */}
      <Audio src={staticFile("audio/bg1.mp3")} volume={bgmVolume} loop />
      {/* 영어 TTS 더빙 */}
      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}

      {/* 상단 밴드 — 영어 2단 헤더 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: TOP_BAND, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 24, gap: 14 }}>
        <div style={{ background: "rgba(24,20,36,0.5)", color: "#fff", fontSize: 36, fontWeight: 700, letterSpacing: -0.3, padding: "6px 24px", borderRadius: 12, whiteSpace: "nowrap" }}>{kicker}</div>
        <div style={{ color: "#FAE100", fontWeight: 900, fontSize: 68, lineHeight: 1.22, letterSpacing: -1, textAlign: "center", padding: "0 48px", textShadow: "0 3px 16px rgba(40,20,80,0.45)" }}>{title}</div>
      </div>

      {/* 하단 밴드 — EN/中 이중 자막 (로고·URL 없음) */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1920 - (TOP_BAND + CENTER_H), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Subtitles subs={subs} />
      </div>
    </AbsoluteFill>
  );
};

export const purpleEnMetadata: CalculateMetadataFunction<PurpleEnProps> = ({ props }) => ({
  durationInFrames: Math.round(props.videoSec * 30),
});
