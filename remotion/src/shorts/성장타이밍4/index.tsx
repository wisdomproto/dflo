import script from "./script.json";
import tKo from "./timing-ko.json";
import tTh from "./timing-th.json";
import { PresenterShort, presenterDuration } from "../_shared/PresenterShort";

// 성장 타이밍 4번의 기회 — PresenterShort(원장 정면 베이스 + 인포그래픽 인서트 + 인트로/CTA 카드).
// 마케팅 콘텐츠 #2. 인포그래픽 4컷(c3·c4·c6·c8) = 업로드된 언어공용 이미지 + insertLabels 언어별 오버레이.
// videoSrc = presenter-base(clean.mp4 설명구간 정면 베이스에서 랜덤 cut) 를 #2 음성으로 재립싱크한 영상.
const S = script as never;
const SLUG = "성장타이밍4";

const mkFinal = (lang: string, t: any): React.FC => () => (
  <PresenterShort script={S} timing={t} lang={lang} slug={SLUG} videoSrc={`videos/${SLUG}-presenter-lipsync-${lang}.mp4`} />
);

// KO (원장 모국어, 클론음성)
export const TIMING4_KO_DURATION = presenterDuration(tKo);
export const Timing4KO = mkFinal("ko", tKo);

// TH
export const TIMING4_TH_DURATION = presenterDuration(tTh);
export const Timing4TH = mkFinal("th", tTh);
