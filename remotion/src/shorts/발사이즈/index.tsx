import script from "./script.json";
import tEn from "./timing-en.json";
import tTh from "./timing-th.json";
import { FaithfulShort, shortDuration } from "../_shared/FaithfulShort";

const S = script as never;
const SLUG = "발사이즈";

// 🔀혼합: 원장 토킹헤드 + 인서트(평균 발사이즈 표·공식 칠판·신발·38% 산점도)
// → 통영상 LatentSync(no-face 패치가 인서트 통과 = 원장만 립싱크). 칼슘/성조숙음식 방식. FaithfulShort linear.
const mkPreview = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" />
);
const mkFootage = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" overlays={false} audio={false} />
);
const mkFinal = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="linear" videoSrc={`videos/발사이즈-lipsync-${lang}.mp4`} />
);

// EN (영어 먼저)
export const FOOTSIZE_EN_DURATION = shortDuration(tEn);
export const FootsizeENPreview = mkPreview("en", tEn);
export const FootsizeENFootage = mkFootage("en", tEn);
export const FootsizeEN = mkFinal("en", tEn);

// TH
export const FOOTSIZE_TH_DURATION = shortDuration(tTh);
export const FootsizeTHPreview = mkPreview("th", tTh);
export const FootsizeTHFootage = mkFootage("th", tTh);
export const FootsizeTH = mkFinal("th", tTh);
