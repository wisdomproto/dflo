import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { HookScene } from "./scenes/HookScene";
import { InputScene } from "./scenes/InputScene";
import { ResultScene } from "./scenes/ResultScene";
import { CtaScene } from "./scenes/CtaScene";
import { setLocale } from "./lib/texts";

const T = 15; // 0.5s transition overlap at 30fps

export const HeightReels: React.FC = () => {
  setLocale("ko");
  return (
    <AbsoluteFill>
      <TransitionSeries>
        {/* Scene 1: Hook — 3s */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 2: Input — 5s */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <InputScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 3: Result (count-up → chart → interpretation) — 13s */}
        <TransitionSeries.Sequence durationInFrames={390}>
          <ResultScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 4: CTA — 5s */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <CtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
