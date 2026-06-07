import script from "./script.json";
import tEn from "./timing-en.json";
import tTh from "./timing-th.json";
import { FaithfulShort, shortDuration } from "../_shared/FaithfulShort";

const S = script as never;
const SLUG = "부작용";
const mkPreview = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" />
);
const mkFootage = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" overlays={false} audio={false} />
);
const mkFinal = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="linear" videoSrc={`videos/부작용-lipsync-${lang}.mp4`} />
);

// EN (영어 먼저)
export const BUJAKYONG_EN_DURATION = shortDuration(tEn);
export const BujakyongENPreview = mkPreview("en", tEn);
export const BujakyongENFootage = mkFootage("en", tEn);
export const BujakyongEN = mkFinal("en", tEn);
// TH
export const BUJAKYONG_TH_DURATION = shortDuration(tTh);
export const BujakyongTHFootage = mkFootage("th", tTh);
export const BujakyongTH = mkFinal("th", tTh);
