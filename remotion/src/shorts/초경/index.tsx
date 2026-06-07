import script from "./script.json";
import timingTh from "./timing-th.json";
import { FaithfulShort, shortDuration } from "../_shared/FaithfulShort";

export const MENARCHE_TH_DURATION = shortDuration(timingTh);

// 프리뷰: 원본 footage(청크별) 위 Thai 제목·자막·로고 (립싱크 전).
export const MenarcheTHPreview: React.FC = () => (
  <FaithfulShort script={script as never} timing={timingTh} lang="th" slug="초경" videoMode="perchunk" />
);

// 립싱크 입력용: footage만 (오버레이·오디오 없음).
export const MenarcheFootageTH: React.FC = () => (
  <FaithfulShort script={script as never} timing={timingTh} lang="th" slug="초경" videoMode="perchunk" overlays={false} audio={false} />
);

// 최종: 립싱크 완성본 선형재생 + 오버레이.
export const MenarcheTH: React.FC = () => (
  <FaithfulShort script={script as never} timing={timingTh} lang="th" slug="초경" videoMode="linear" videoSrc="videos/초경-lipsync-th.mp4" />
);
