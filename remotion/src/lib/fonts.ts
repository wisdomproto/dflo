import { continueRender, delayRender, getRemotionEnvironment } from "remotion";

const NOTO_SANS_KR_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap";
const NOTO_SANS_THAI_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;900&display=swap";
const INTER_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&display=swap";
const NOTO_SANS_SC_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap";
const NOTO_SANS_TC_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap";
// Pretendard — 한국 서비스/광고 표준 모던 산세리프 (jsDelivr CDN @font-face)
const PRETENDARD_URL =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css";

let loaded = false;

export function ensureFonts() {
  if (loaded) return;
  loaded = true;

  // Player(v4)에선 delayRender 생략 — Google Fonts 지연 시 Player 에러 오버레이 방지.
  const isPlayer = getRemotionEnvironment().isPlayer;
  const handle = isPlayer ? null : delayRender("Loading fonts");

  for (const href of [NOTO_SANS_KR_URL, NOTO_SANS_THAI_URL, INTER_URL, NOTO_SANS_SC_URL, NOTO_SANS_TC_URL, PRETENDARD_URL]) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  Promise.all([
    document.fonts.load("700 16px 'Noto Sans KR'"),
    document.fonts.load("900 16px 'Noto Sans KR'"),
    document.fonts.load("700 16px 'Noto Sans Thai'"),
    document.fonts.load("700 16px 'Inter'"),
    document.fonts.load("800 16px 'Inter'"),
    document.fonts.load("600 16px 'Pretendard'"),
    document.fonts.load("700 16px 'Pretendard'"),
    document.fonts.load("800 16px 'Pretendard'"),
    document.fonts.load("900 16px 'Pretendard'"),
  ]).then(() => {
    if (handle !== null) continueRender(handle);
  }).catch(() => {
    if (handle !== null) continueRender(handle);
  });
}

export const NOTO_SANS_KR = "'Noto Sans KR', 'Noto Sans Thai', sans-serif";
export const NOTO_SANS_THAI = "'Noto Sans Thai', 'Noto Sans KR', sans-serif";
export const INTER = "'Inter', sans-serif";
export const NOTO_SANS_SC = "'Noto Sans SC', 'Noto Sans KR', sans-serif";
export const NOTO_SANS_TC = "'Noto Sans TC', 'Noto Sans KR', sans-serif";
// 한국 광고/UI 기본 — Pretendard 우선, Noto Sans KR 폴백.
export const PRETENDARD = "'Pretendard', 'Noto Sans KR', sans-serif";
