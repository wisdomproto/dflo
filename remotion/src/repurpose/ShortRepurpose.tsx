import { AbsoluteFill, OffthreadVideo, Img, staticFile, Sequence, useVideoConfig, useCurrentFrame, interpolate } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import type { FC } from "react";
import { ensureFonts, NOTO_SANS_KR, NOTO_SANS_THAI } from "../lib/fonts";

ensureFonts();

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const OUTRO_SEC = 3;

// 원본(초) + 검정 아웃트로(3초) 를 프레임으로. Root 의 durationInFrames 와 일치시킨다.
export function repurposeDuration(videoSec: number, fps = 30) {
  return Math.round((videoSec + OUTRO_SEC) * fps);
}

export type Subtitle = { start: number; end: number; text: string };

// type(인터페이스 X) — Remotion Composition props 는 Record<string,unknown> 제약이라
// 암묵 인덱스 시그니처가 붙는 type 별칭이어야 한다(interface 는 불만족).
export type RepurposeProps = {
  videoSrc: string;       // public 상대 경로, 예: "videos/repurpose-src.mp4"
  videoSec: number;       // 원본 영상 길이(초)
  url: string;            // "dr187growup.com" | "dr187growup.com/th"
  outroLine: string;      // 줄바꿈은 \n
  headerTitle?: string;   // 태국어판: 상단에 박힌 원본 한국어 제목을 덮고 표시할 태국어 제목
  subtitles?: Subtitle[]; // 태국어판: 음성 STT → 번역 자막 (start/end 초)
  thai?: boolean;         // true 면 헤더/자막/아웃트로에 태국어 폰트
};

// 검정 아웃트로 — 로고 + 한 줄 카피 + 홈페이지 URL (메신저 없음)
function Outro({ url, line, font }: { url: string; line: string; font: string }) {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 12], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center", fontFamily: font }}>
      <div style={{ opacity: op, display: "flex", flexDirection: "column", alignItems: "center", gap: 48 }}>
        <Img src={staticFile("images/logo_en_wh.png")} style={{ width: 540, height: "auto" }} />
        <div style={{ color: "#fff", fontSize: 58, fontWeight: 700, textAlign: "center", lineHeight: 1.42, whiteSpace: "pre-line" }}>{line}</div>
        <div style={{ color: "#FAE100", fontSize: 44, fontWeight: 600, letterSpacing: 1 }}>{url}</div>
      </div>
    </AbsoluteFill>
  );
}

// 상단 헤더 — 원본 한국어 제목을 그라데이션 밴드로 덮고 태국어 제목 표시 (태국어판 전용)
function Header({ title, font }: { title: string; font: string }) {
  return (
    <div
      style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 500,
        background: "linear-gradient(to bottom, #000 0%, #000 90%, rgba(0,0,0,0) 100%)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 92, fontFamily: font,
      }}
    >
      <div style={{ color: "#fff", fontSize: 54, fontWeight: 800, textAlign: "center", lineHeight: 1.32, padding: "0 56px", textShadow: "0 2px 14px rgba(0,0,0,0.6)" }}>
        {title}
      </div>
    </div>
  );
}

// 하단 자막 — 현재 시각에 해당하는 세그먼트만 (로고 밴드 위, 태국어판 전용)
function Subtitles({ subs, font }: { subs: Subtitle[]; font: string }) {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const cur = subs.find((s) => t >= s.start && t < s.end);
  if (!cur) return null;
  return (
    <div style={{ position: "absolute", left: 56, right: 56, bottom: 500, textAlign: "center", fontFamily: font }}>
      <span
        style={{
          background: "rgba(0,0,0,0.66)", color: "#fff",
          fontSize: 46, fontWeight: 700, lineHeight: 1.55, padding: "8px 20px", borderRadius: 12,
          WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone",
        }}
      >
        {cur.text}
      </span>
    </div>
  );
}

export const ShortRepurpose: FC<RepurposeProps> = ({ videoSrc, videoSec, url, outroLine, headerTitle, subtitles, thai }) => {
  const { fps } = useVideoConfig();
  const bodyFrames = Math.round(videoSec * fps);
  const outroFrames = OUTRO_SEC * fps;
  const font = thai ? NOTO_SANS_THAI : NOTO_SANS_KR;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 본편 — 원본 영상 + (태국어판) 상단 헤더·하단 자막 + 하단 로고/URL 밴드 */}
      <Sequence durationInFrames={bodyFrames}>
        <AbsoluteFill>
          <OffthreadVideo src={staticFile(videoSrc)} />
          {headerTitle ? <Header title={headerTitle} font={font} /> : null}
          {subtitles && subtitles.length ? <Subtitles subs={subtitles} font={font} /> : null}
          <div
            style={{
              position: "absolute", left: 0, right: 0, bottom: 0, height: 460,
              background: "linear-gradient(to top, #000 0%, #000 90%, rgba(0,0,0,0) 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
              paddingBottom: 172, fontFamily: font,
            }}
          >
            <Img src={staticFile("images/logo_en_wh.png")} style={{ height: 116, width: "auto", marginBottom: 16 }} />
            <div style={{ color: "rgba(255,255,255,0.94)", fontSize: 33, fontWeight: 500, letterSpacing: 1 }}>{url}</div>
          </div>
        </AbsoluteFill>
      </Sequence>
      {/* 검정 아웃트로 */}
      <Sequence from={bodyFrames} durationInFrames={outroFrames}>
        <Outro url={url} line={outroLine} font={font} />
      </Sequence>
    </AbsoluteFill>
  );
};

// 영상별 길이: 본편(videoSec) + 검정 아웃트로(3초) → 프레임. Root 의 calculateMetadata 로 연결.
export const repurposeMetadata: CalculateMetadataFunction<RepurposeProps> = ({ props }) => ({
  durationInFrames: repurposeDuration(props.videoSec, 30),
});
