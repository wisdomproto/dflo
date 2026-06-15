import script from "./script.json";
import tKo from "./timing-ko.json";
import { PresenterShort, presenterDuration } from "../_shared/PresenterShort";

// O자 다리 교정하면 키 커질까? — PresenterShort(원장 정면 베이스 + 인포그래픽 인서트 + 인트로/CTA). 마케팅 콘텐츠 #32.
// videoSrc = presenter-base 랜덤 cut 재립싱크. 비ko 언어 추가 시 timing-<lang>.json import + mkFinal 추가.
const S = script as never;
const SLUG = "오다리키";

const mkFinal = (lang: string, t: any): React.FC => () => (
  <PresenterShort script={S} timing={t} lang={lang} slug={SLUG} videoSrc={`videos/${SLUG}-presenter-lipsync-${lang}.mp4`} />
);

// KO (원장 모국어, 클론음성)
export const BOWLEGS_KO_DURATION = presenterDuration(tKo);
export const BowLegsKO = mkFinal("ko", tKo);
