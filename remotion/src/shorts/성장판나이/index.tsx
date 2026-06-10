import script from "./script.json";
import tKo from "./timing-ko.json";
import tTh from "./timing-th.json";
import { PresenterShort, presenterDuration } from "../_shared/PresenterShort";

// 성장판이 닫히는 나이 — PresenterShort(원장 정면 베이스 + 인포그래픽 인서트 + 인트로/CTA). 마케팅 콘텐츠 #3.
// 인포그래픽 4컷(c3·c5·c7·c9) = 업로드 언어공용 이미지 + insertLabels. videoSrc = presenter-base 랜덤 cut 재립싱크.
const S = script as never;
const SLUG = "성장판나이";

const mkFinal = (lang: string, t: any): React.FC => () => (
  <PresenterShort script={S} timing={t} lang={lang} slug={SLUG} videoSrc={`videos/${SLUG}-presenter-lipsync-${lang}.mp4`} />
);

// KO (원장 모국어, 클론음성)
export const PLATEAGE_KO_DURATION = presenterDuration(tKo);
export const PlateAgeKO = mkFinal("ko", tKo);

// TH
export const PLATEAGE_TH_DURATION = presenterDuration(tTh);
export const PlateAgeTH = mkFinal("th", tTh);
