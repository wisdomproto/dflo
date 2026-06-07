import script from "./script.json";
import tEn from "./timing-en.json";
import tTh from "./timing-th.json";
import { FaithfulShort, shortDuration } from "../_shared/FaithfulShort";

const S = script as never;
const SLUG = "몽정";

// 보이스오버 몽타주 → 립싱크 없음. perchunk(원본 footage 청크별) + 오버레이 + 음성 = 곧 최종.
const mkFinal = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" />
);

// EN
export const MONGJEONG_EN_DURATION = shortDuration(tEn);
export const MongjeongEN = mkFinal("en", tEn);
// TH
export const MONGJEONG_TH_DURATION = shortDuration(tTh);
export const MongjeongTH = mkFinal("th", tTh);
