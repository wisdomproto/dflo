import script from "./script.json";
import tKo from "./timing-ko.json";
import tTh from "./timing-th.json";
import { PresenterShort, presenterDuration } from "../_shared/PresenterShort";

// 키 유전 80% — PresenterShort(원장 정면 MainClip 베이스 재립싱크 + 다크 RVM).
// 인포그래픽 4컷(c3·c4·c6·c7) = 언어중립 러프 플레이스홀더 + insertLabels 텍스트 오버레이.
// 마케팅 콘텐츠 #1 「키 유전 80% vs 환경 20%」 기반. TH 우선 → 확인 후 KO·EN.
const S = script as never;
const SLUG = "키유전80";

const mkFinal = (lang: string, t: any): React.FC => () => (
  <PresenterShort script={S} timing={t} lang={lang} slug={SLUG} videoSrc={`videos/키유전80-presenter-lipsync-${lang}.mp4`} />
);

// KO (원장 모국어, 클론음성) — 기본 제작 언어
export const HEIGHTGENES_KO_DURATION = presenterDuration(tKo);
export const HeightGenesKO = mkFinal("ko", tKo);

// TH
export const HEIGHTGENES_TH_DURATION = presenterDuration(tTh);
export const HeightGenesTH = mkFinal("th", tTh);
