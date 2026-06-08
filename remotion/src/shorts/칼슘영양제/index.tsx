import script from "./script.json";
import tEn from "./timing-en.json";
import tTh from "./timing-th.json";
import { FaithfulShort, shortDuration } from "../_shared/FaithfulShort";

const S = script as never;
const SLUG = "칼슘영양제";

// 🎙️원장 토킹헤드 + 칼슘 제품·산호 인서트 → 통영상 LatentSync(no-face 패치가 인서트 통과 = 원장만 립싱크). 영양제/부작용 방식.
const mkPreview = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" />
);
const mkFootage = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" overlays={false} audio={false} />
);
const mkFinal = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="linear" videoSrc={`videos/칼슘영양제-lipsync-${lang}.mp4`} />
);

// EN (영어 먼저)
export const CALCIUM_EN_DURATION = shortDuration(tEn);
export const CalciumENPreview = mkPreview("en", tEn);
export const CalciumENFootage = mkFootage("en", tEn);
export const CalciumEN = mkFinal("en", tEn);

// TH
export const CALCIUM_TH_DURATION = shortDuration(tTh);
export const CalciumTHFootage = mkFootage("th", tTh);
export const CalciumTH = mkFinal("th", tTh);
