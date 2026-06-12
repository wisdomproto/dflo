// 워커 렌더 + v4 Player 공용 제네릭 진입점 — inputProps로 script/timing/assets 주입.
// calculateMetadata는 renderMedia(selectComposition) 경로 전용 — Player는 duration을 직접 prop으로 받는다.
import type { CalculateMetadataFunction } from "remotion";
import { PresenterShort, presenterDuration } from "./PresenterShort";

export type PresenterGenericProps = {
  script: never;          // PresenterShort 의 Script (파일 내 로컬 타입 — never 캐스팅 패턴은 per-slug index.tsx 와 동일)
  timing: { id: string; durFrames: number; origStartF: number; rate: number }[];
  lang: string;
  slug: string;
  assets: { videoSrc: string; audio: Record<string, string> };
};

export const PresenterGeneric: React.FC<PresenterGenericProps> = (p) => (
  <PresenterShort script={p.script} timing={p.timing} lang={p.lang} slug={p.slug} videoSrc={p.assets.videoSrc} assets={p.assets} />
);

export const calcPresenterMetadata: CalculateMetadataFunction<PresenterGenericProps> = ({ props }) => ({
  durationInFrames: Math.max(1, presenterDuration(props.timing)),
  fps: 30,
  width: 1080,
  height: 1920,
});
