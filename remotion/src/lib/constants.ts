import {
  calculateHeightPercentileLMS,
  predictAdultHeightLMS,
  heightAtSamePercentile,
} from "../data/growthStandard";
import { t } from "./texts";

export const SAMPLE_GENDER = "male" as const;
export const SAMPLE_AGE = 10;
// 중앙값(50th)에 정확히 맞춰 "평균적인 아이"로 — 대놓고 광고처럼 보이지 않게 (태국 10세 137 / 한국 138.8)
export const SAMPLE_HEIGHT = 137;

// Computed at render time from the active locale's growth standard
export function samplePercentile() {
  return calculateHeightPercentileLMS(
    SAMPLE_HEIGHT,
    SAMPLE_AGE,
    SAMPLE_GENDER,
    t().growthStandard
  );
}
export function samplePredicted() {
  return predictAdultHeightLMS(
    SAMPLE_HEIGHT,
    SAMPLE_AGE,
    SAMPLE_GENDER,
    t().growthStandard
  );
}

// Growth path from current age to 18 (locale-aware standard)
export function buildGrowthPath() {
  const standard = t().growthStandard;
  const points: { age: number; height: number }[] = [
    { age: SAMPLE_AGE, height: SAMPLE_HEIGHT },
  ];
  for (let a = SAMPLE_AGE + 0.5; a <= 17.5; a += 0.5) {
    const h = heightAtSamePercentile(
      SAMPLE_HEIGHT,
      SAMPLE_AGE,
      a,
      SAMPLE_GENDER,
      standard
    );
    if (h > 0) points.push({ age: a, height: h });
  }
  points.push({ age: 18, height: predictAdultHeightLMS(SAMPLE_HEIGHT, SAMPLE_AGE, SAMPLE_GENDER, standard) });
  return points;
}

// Colors — matching v4 website design
export const COLORS = {
  // Brand teal
  teal: "#0F6E56",
  tealDark: "#0D5A47",
  tealDarkest: "#1A3A32",
  tealLight: "#E8F5F0",
  tealAlpha06: "rgba(15,110,86,0.06)",
  // Accent
  accent: "#F59E0B",
  accentDark: "#D97706",
  // Kakao
  kakaoYellow: "#FEE500",
  kakaoBrown: "#3C1E1E",
  // LINE (Thai messenger)
  lineGreen: "#06C755",
  // Neutrals
  white: "#FFFFFF",
  whiteAlpha15: "rgba(255,255,255,0.15)",
  whiteAlpha65: "rgba(255,255,255,0.65)",
  whiteAlpha80: "rgba(255,255,255,0.80)",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray900: "#111827",
  // Chart percentile colors (matching website)
  chart95th: "rgba(239,68,68,0.3)",
  chart50th: "rgba(34,197,94,0.5)",
  chart5th: "rgba(59,130,246,0.3)",
  chartPath: "#0F6E56",
  chartPathFill: "rgba(15,110,86,0.06)",
  // Amber (interpretation)
  amberBg: "#FEF3C7",
  amberText: "#92400E",
} as const;

// Timing
export const FPS = 30;

// SFX URLs (from @remotion/sfx)
export const SFX = {
  whoosh: "https://remotion.media/whoosh.wav",
  click: "https://remotion.media/mouse-click.wav",
  ding: "https://remotion.media/ding.wav",
} as const;

// Website URL for CTA
export const WEBSITE_URL = "www.dr187growup.com/th";
