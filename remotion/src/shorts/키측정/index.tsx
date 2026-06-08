import script from "./script.json";
import tEn from "./timing-en.json";
import { FaithfulShort, shortDuration } from "../_shared/FaithfulShort";
import { StackedShort } from "../_shared/StackedShort";

const S = script as never;
const SLUG = "키측정";

// 🔀MIX(2인 만담 + 원장 토킹헤드 + 일러스트) → 내레이션 해설형 "헤더/자막/메인영상" 스택.
// 음성=화면 밖 내레이터(원장 클론). 영상=B롤. 원장 클로즈업 구간(script lipsync:true)만 립싱크.
// 립싱크 입력 footage(full-bleed warped, 오버레이/음성 X) — 립싱크 재생성 때만 렌더.
const mkFootage = (lang: string, t: any): React.FC => () => (
  <FaithfulShort script={S} timing={t} lang={lang} slug={SLUG} videoMode="perchunk" overlays={false} audio={false} />
);
const mkFinal = (lang: string, t: any): React.FC => () => (
  <StackedShort script={S} timing={t} lang={lang} slug={SLUG} lipsyncSrc={`videos/키측정-lipsync-${lang}-panel.mp4`} />
);

// EN (영어 먼저)
export const KICHEUKJEONG_EN_DURATION = shortDuration(tEn);
export const KicheukjeongENFootage = mkFootage("en", tEn);
export const KicheukjeongEN = mkFinal("en", tEn);
