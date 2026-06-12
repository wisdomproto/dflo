import { continueRender, delayRender, getRemotionEnvironment } from "remotion";

const NOTO_SANS_KR_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap";
const NOTO_SANS_THAI_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;900&display=swap";
const INTER_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@600;700;900&display=swap";
const NOTO_SANS_SC_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap";
const NOTO_SANS_TC_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap";

let loaded = false;

export function ensureFonts() {
  if (loaded) return;
  loaded = true;

  // Player(v4)에선 delayRender 생략 — Google Fonts 지연 시 Player 에러 오버레이 방지.
  const isPlayer = getRemotionEnvironment().isPlayer;
  const handle = isPlayer ? null : delayRender("Loading fonts");

  const link1 = document.createElement("link");
  link1.rel = "stylesheet";
  link1.href = NOTO_SANS_KR_URL;
  document.head.appendChild(link1);

  const link2 = document.createElement("link");
  link2.rel = "stylesheet";
  link2.href = NOTO_SANS_THAI_URL;
  document.head.appendChild(link2);

  const link3 = document.createElement("link");
  link3.rel = "stylesheet";
  link3.href = INTER_URL;
  document.head.appendChild(link3);

  const link4 = document.createElement("link");
  link4.rel = "stylesheet";
  link4.href = NOTO_SANS_SC_URL;
  document.head.appendChild(link4);

  const link5 = document.createElement("link");
  link5.rel = "stylesheet";
  link5.href = NOTO_SANS_TC_URL;
  document.head.appendChild(link5);

  Promise.all([
    document.fonts.load("700 16px 'Noto Sans KR'"),
    document.fonts.load("900 16px 'Noto Sans KR'"),
    document.fonts.load("700 16px 'Noto Sans Thai'"),
    document.fonts.load("700 16px 'Inter'"),
  ]).then(() => {
    if (handle !== null) continueRender(handle);
  });
}

export const NOTO_SANS_KR = "'Noto Sans KR', 'Noto Sans Thai', sans-serif";
export const NOTO_SANS_THAI = "'Noto Sans Thai', 'Noto Sans KR', sans-serif";
export const INTER = "'Inter', sans-serif";
export const NOTO_SANS_SC = "'Noto Sans SC', 'Noto Sans KR', sans-serif";
export const NOTO_SANS_TC = "'Noto Sans TC', 'Noto Sans KR', sans-serif";
