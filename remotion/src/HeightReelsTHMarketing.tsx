// TH marketing reel — 한국어 마케팅 릴(HeightReelsKRMarketing)의 태국어 버전.
// 구조/타이밍/씬은 100% 동일하고, setLocale("th") 로 모든 카피가 태국어로 바뀐다.
// 1 인트로(intro.mp4) → 2 원장·병원 소개 → 3 통합 치료(growingup.mp4)
// → 4 셀럽 아역(celeb-reel.mp4) → 5 CTA(홈페이지 .../th + LINE 안내)
import { AbsoluteFill, Audio, staticFile, interpolate } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { zoom } from "./lib/zoomTransition";
import { FearIntroScene } from "./scenes/FearIntroScene";
import { ClinicScene } from "./scenes/ClinicScene";
import { VideoScene } from "./scenes/VideoScene";
import { IntegratedCareScene } from "./scenes/IntegratedCareScene";
import { CtaPromoScene } from "./scenes/CtaPromoScene";
import { setLocale, t } from "./lib/texts";

setLocale("th");

// 액티브한 릴스 광고 톤: 짧은 컷 전환(slide/zoom 믹스) + 압축된 씬 길이로 24초(720f)에 맞춤.
// 전환 길이(짧게): slide=12f, zoom=14f
const TS = 12; // slide 전환
const TZ = 14; // zoom 전환
// dur: 150 / 208 / 164 / 124 / 126,  trans: 12 / 14 / 12 / 14  → total = 772 − 52 = 720 (24.0s)
//   씬 시작: S1=0, S2=138, S3=332, S4=484, S5=594

export const HeightReelsTHMarketing: React.FC = () => {
  setLocale("th");
  const L = t();

  return (
    <AbsoluteFill>
      {/* 배경음악 — 24초(720f)에 맞춰 자르고 인트로/아웃트로 페이드 */}
      <Audio
        src={staticFile("audio/bg1.mp3")}
        endAt={720}
        volume={(f) =>
          interpolate(f, [0, 18, 690, 720], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />

      <TransitionSeries>
        {/* S1 인트로 — 키 걱정 → 충분히 클 수 있습니다 (intro.mp4, ~7초를 충분히 노출) */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <FearIntroScene />
        </TransitionSeries.Sequence>
        {/* 인트로 → 병원: 오른쪽에서 밀고 들어오는 슬라이드 (전진감) */}
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: TS })} />

        {/* S2 원장·실적·병원 통합 신뢰 */}
        <TransitionSeries.Sequence durationInFrames={208}>
          <ClinicScene marketing />
        </TransitionSeries.Sequence>
        {/* 병원 → 통합치료: 줌인 컷 */}
        <TransitionSeries.Transition presentation={zoom()} timing={linearTiming({ durationInFrames: TZ })} />

        {/* S3 통합 치료 — 5가지 관리 아이콘이 아이 주변을 순차 등장 (growingup.mp4) */}
        <TransitionSeries.Sequence durationInFrames={164}>
          <IntegratedCareScene eyebrow={L.vsRightTitle} caption={L.integratedPunch} />
        </TransitionSeries.Sequence>
        {/* 통합치료 → 셀럽: 아래에서 올라오는 슬라이드 */}
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: TS })} />

        {/* S4 셀럽 아역배우가 찾는 곳 (celeb-reel.mp4) */}
        <TransitionSeries.Sequence durationInFrames={124}>
          <VideoScene src="videos/celeb-reel.mp4" playbackRate={1.9} />
        </TransitionSeries.Sequence>
        {/* 셀럽 → CTA: 줌인 컷 */}
        <TransitionSeries.Transition presentation={zoom()} timing={linearTiming({ durationInFrames: TZ })} />

        {/* S5 미니멀 CTA — 로고 + "지금 시작하세요" + 홈페이지 주소(.../th) */}
        <TransitionSeries.Sequence durationInFrames={126}>
          <CtaPromoScene minimal heading={L.ctaStartLine} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
