// KR marketing reel — 8 cuts, full funnel:
// fear/golden → clinic trust (incl. lecture+95%) → VS → celeb → cases → measure demo → result+site → CTA
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { FearIntroScene } from "./scenes/FearIntroScene";
import { ClinicScene } from "./scenes/ClinicScene";
import { VsScene } from "./scenes/VsScene";
import { CelebScene } from "./scenes/CelebScene";
import { CasesScene } from "./scenes/CasesScene";
import { HookScene } from "./scenes/HookScene";
import { InputScene } from "./scenes/InputScene";
import { ResultScene } from "./scenes/ResultScene";
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
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        {/* S3 VS 차별화 */}
        <TransitionSeries.Sequence durationInFrames={180}>
          <VsScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        {/* S4 외국 셀럽·아역배우가 찾는 곳 */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <CelebScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        {/* S5 성공 사례 */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <CasesScene line={L.casesCelebLine} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        {/* S6 예측키 측정 데모 (Hook + Input) */}
        <TransitionSeries.Sequence durationInFrames={60}>
          <HookScene hideCta />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={80}>
          <InputScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        {/* S7 결과 + 홈페이지 무료 측정 멘트 */}
        <TransitionSeries.Sequence durationInFrames={185}>
          <ResultScene footerNote={L.demoFreeSite} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        {/* S8 메신저 CTA */}
        <TransitionSeries.Sequence durationInFrames={135}>
          <CtaPromoScene heading={L.ctaGoldenTime} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
