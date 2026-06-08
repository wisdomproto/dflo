import script from "./script.json";
import tEn from "./timing-en.json";
import tTh from "./timing-th.json";
import { FaithfulShort, shortDuration } from "../_shared/FaithfulShort";

const S = script as never;
const SLUG = "성조숙음식";

// 📋몽타주(원장 내레이션 주도 + 일러스트·데이터 인서트) → 통영상 LatentSync.
// no-face 패치가 인서트(타이틀카드·소·우유·데이터표) 통과 = 원장 얼굴만 립싱크 (부작용/영양제 방식).
const mkPreview = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" />
);
const mkFootage = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" overlays={false} audio={false} />
);
const mkFinal = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="linear" videoSrc={`videos/성조숙음식-lipsync-${lang}.mp4`} />
);

// EN (영어 먼저)
export const SEONGJOSUK_EN_DURATION = shortDuration(tEn);
export const SeongjosukENPreview = mkPreview("en", tEn);
export const SeongjosukENFootage = mkFootage("en", tEn);
export const SeongjosukEN = mkFinal("en", tEn);

// TH
export const SEONGJOSUK_TH_DURATION = shortDuration(tTh);
export const SeongjosukTHFootage = mkFootage("th", tTh);
export const SeongjosukTH = mkFinal("th", tTh);
