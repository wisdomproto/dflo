import { AbsoluteFill, OffthreadVideo, Img, staticFile, useVideoConfig } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import type { FC } from "react";
import { ensureFonts, PRETENDARD } from "../lib/fonts";

ensureFonts();

// 레퍼런스 측정값 (1080×1920)
const TOP_BAND = 436; // 상단 보라 밴드(2단 제목) 높이
const CENTER_H = 1044; // 중앙 영상 창 높이 (y 436–1480)
// 하단 밴드 = 1480–1920 (440)

// 한글 전용 보라 프레임 재배포 릴. ShortRepurpose(태국어)와 별개.
// type(인터페이스 X) — Remotion Composition props 는 Record<string,unknown> 제약.
export type PurpleProps = {
  videoSrc: string; // public 상대 경로, 예: "videos/xxx-src.mp4"
  videoSec: number; // 원본 길이(초) — 아웃트로 없음, 이 길이 그대로
  kicker: string; // 작은 윗줄 (흰 글씨 + 어두운 박스)
  title: string; // 큰 메인 (노랑). \n 허용
  url: string; // "dr187growup.com"
};

export const PurpleRepurpose: FC<PurpleProps> = ({ videoSrc, kicker, title, url }) => {
  return (
    <AbsoluteFill
      style={{
        // 세로 보라 그라데이션 — 레퍼런스 톤(#8461DE 위 → #6E45B6 아래)
        background: "linear-gradient(180deg, #8461DE 0%, #7A54D0 52%, #6E45B6 100%)",
        fontFamily: PRETENDARD,
      }}
    >
      {/* 중앙 영상 창 — 폭 맞춰 채우고 세로 가운데 크롭 (원본 상·하단 baked 제목/로고 자동 제외) */}
      <div style={{ position: "absolute", top: TOP_BAND, left: 0, width: 1080, height: CENTER_H, overflow: "hidden" }}>
        <OffthreadVideo src={staticFile(videoSrc)} style={{ width: 1080, height: CENTER_H, objectFit: "cover" }} />
      </div>

      {/* 상단 밴드 — 2단 제목 */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: TOP_BAND,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          paddingTop: 24, gap: 16,
        }}
      >
        <div
          style={{
            background: "rgba(24,20,36,0.5)", color: "#fff",
            fontSize: 40, fontWeight: 700, letterSpacing: -0.5,
            padding: "6px 24px", borderRadius: 12, whiteSpace: "nowrap",
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            color: "#FAE100", fontWeight: 900, fontSize: 76, lineHeight: 1.24,
            letterSpacing: -1.5, textAlign: "center", padding: "0 52px", whiteSpace: "pre-line",
            textShadow: "0 3px 16px rgba(40,20,80,0.45)",
          }}
        >
          {title}
        </div>
      </div>

      {/* 하단 밴드 — 로고 + URL */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 1920 - (TOP_BAND + CENTER_H),
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18,
        }}
      >
        <Img src={staticFile("images/logo_en_wh.png")} style={{ width: 470, height: "auto" }} />
        <div style={{ color: "rgba(255,255,255,0.96)", fontSize: 36, fontWeight: 600, letterSpacing: 1 }}>{url}</div>
      </div>
    </AbsoluteFill>
  );
};

// 아웃트로 없음 — 원본 길이 그대로.
export const purpleMetadata: CalculateMetadataFunction<PurpleProps> = ({ props }) => ({
  durationInFrames: Math.round(props.videoSec * 30),
});
