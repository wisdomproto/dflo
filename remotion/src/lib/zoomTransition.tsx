// Custom "zoom" transition presentation for @remotion/transitions.
// 들어오는 씬은 0.92 → 1로 확대되며 페이드인, 나가는 씬은 1 → 1.06으로 밀려나며 페이드아웃.
// 릴스 광고 톤의 경쾌한 줌 컷 느낌.
import { AbsoluteFill } from "remotion";
import type { TransitionPresentation } from "@remotion/transitions";

export type ZoomProps = {
  // 들어오는 씬 시작 배율 (1보다 작으면 줌인, 크면 줌아웃)
  enterFrom?: number;
  // 나가는 씬 끝 배율
  exitTo?: number;
};

type Props = {
  presentationProgress: number;
  presentationDirection: "entering" | "exiting";
  children: React.ReactNode;
  passedProps: ZoomProps;
};

const ZoomPresentation: React.FC<Props> = ({
  presentationProgress,
  presentationDirection,
  children,
  passedProps,
}) => {
  const entering = presentationDirection === "entering";
  const enterFrom = passedProps.enterFrom ?? 0.92;
  const exitTo = passedProps.exitTo ?? 1.06;

  const scale = entering
    ? enterFrom + (1 - enterFrom) * presentationProgress
    : 1 + (exitTo - 1) * presentationProgress;
  const opacity = entering ? presentationProgress : 1 - presentationProgress;

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const zoom = (
  props: ZoomProps = {}
): TransitionPresentation<ZoomProps> => {
  return { component: ZoomPresentation, props };
};
