// KR marketing reel — 5 cuts (brand/trust funnel, no in-reel measure demo):
// fear/golden → clinic trust (incl. lecture+95%) → VS → celeb → CTA(홈페이지 예측키 무료 측정 안내)
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { FearIntroScene } from "./scenes/FearIntroScene";
import { ClinicScene } from "./scenes/ClinicScene";
import { DirectorGridScene } from "./scenes/DirectorGridScene";
import { VsScene } from "./scenes/VsScene";
import { CelebScene } from "./scenes/CelebScene";
import { CtaPromoScene } from "./scenes/CtaPromoScene";
import { setLocale, t } from "./lib/texts";

setLocale("ko");

const T = 15;

export const HeightReelsKRMarketing: React.FC = () => {
  setLocale("ko");
  const L = t();

  return (
    <AbsoluteFill>
      <TransitionSeries>
        {/* S1 키 성장·골든타임 */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <FearIntroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        {/* S2 원장·실적·병원 통합 신뢰 */}
        <TransitionSeries.Sequence durationInFrames={165}>
          <ClinicScene marketing />
        </TransitionSeries.Sequence>
        {/* 슬라이드로 차별화 씬을 임팩트 있게 진입 */}
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />

        {/* S3 VS 차별화 */}
        <TransitionSeries.Sequence durationInFrames={180}>
          <VsScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        {/* S4 원장 진료·학부모 강연 바둑판 (감성 — CTA 직전 셀럽과 함께) */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <DirectorGridScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        {/* S5 외국 셀럽·아역배우가 찾는 곳 */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <CelebScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        {/* S5 메신저 CTA + "예측키 무료 측정은 홈페이지에서" 안내 (버튼·ctaSiteMeasure·URL) */}
        <TransitionSeries.Sequence durationInFrames={135}>
          <CtaPromoScene heading={L.ctaGoldenTime} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
