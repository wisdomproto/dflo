import script from "./script.json";
import tEn from "./timing-en.json";
import tTh from "./timing-th.json";
import tKo from "./timing-ko.json";
import { FaithfulShort, shortDuration } from "../_shared/FaithfulShort";
import { PresenterShort } from "../_shared/PresenterShort";

const S = script as never;
const SLUG = "가짜성조숙증";

// 🔀혼합: 원장 토킹헤드(c2·c3·c9·c10) + 그래픽(지방·부신·3조건 리스트) → 통영상 LatentSync(no-face 패치=원장만 립싱크).
// 이중언어 정책(cover 없음): 영상 풀노출 + 헤더 + 작은 자막박스. FaithfulShort linear.
const mkPreview = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" />
);
const mkFootage = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" overlays={false} audio={false} />
);
const mkFinal = (lang: string, t: any): React.FC => () => (
  <PresenterShort script={S} timing={t} lang={lang} slug={SLUG} videoSrc={`videos/가짜성조숙증-presenter-lipsync-${lang}.mp4`} />
);

// EN
export const FAKEPUB_EN_DURATION = shortDuration(tEn);
export const FakepubertyENPreview = mkPreview("en", tEn);
export const FakepubertyENFootage = mkFootage("en", tEn);
export const FakepubertyEN = mkFinal("en", tEn);

// TH
export const FAKEPUB_TH_DURATION = shortDuration(tTh);
export const FakepubertyTHPreview = mkPreview("th", tTh);
export const FakepubertyTHFootage = mkFootage("th", tTh);
export const FakepubertyTH = mkFinal("th", tTh);

// KO (원장 모국어, 클론음성)
export const FAKEPUB_KO_DURATION = shortDuration(tKo);
export const FakepubertyKO = mkFinal("ko", tKo);
