import script from "./script.json";
import tTh from "./timing-th.json";
import tEn from "./timing-en.json";
import tVi from "./timing-vi.json";
import tZh from "./timing-zh.json";
import { FaithfulShort, shortDuration } from "../_shared/FaithfulShort";

const S = script as never;
const SLUG = "초경";
const mkPreview = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" />
);
const mkFootage = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" overlays={false} audio={false} />
);
const mkFinal = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="linear" videoSrc={`videos/초경-lipsync-${lang}.mp4`} />
);

// TH
export const CHOGYEONG_TH_DURATION = shortDuration(tTh);
export const ChogyeongTHPreview = mkPreview("th", tTh);
export const ChogyeongTHFootage = mkFootage("th", tTh);
export const ChogyeongTH = mkFinal("th", tTh);
// EN
export const CHOGYEONG_EN_DURATION = shortDuration(tEn);
export const ChogyeongENPreview = mkPreview("en", tEn);
export const ChogyeongENFootage = mkFootage("en", tEn);
export const ChogyeongEN = mkFinal("en", tEn);
// VI
export const CHOGYEONG_VI_DURATION = shortDuration(tVi);
export const ChogyeongVIFootage = mkFootage("vi", tVi);
export const ChogyeongVI = mkFinal("vi", tVi);
// ZH (⚠️ ElevenLabs 광동어 미지원 → 만다린 발음)
export const CHOGYEONG_ZH_DURATION = shortDuration(tZh);
export const ChogyeongZHFootage = mkFootage("zh", tZh);
export const ChogyeongZH = mkFinal("zh", tZh);
