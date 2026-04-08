import {
  calculateHeightPercentileLMS,
  predictAdultHeightLMS,
  heightAtSamePercentile,
} from "../data/growthStandard";

export const SAMPLE_GENDER = "male" as const;
export const SAMPLE_AGE = 10;
export const SAMPLE_HEIGHT = 140;

// Computed at import time from actual LMS data
export const SAMPLE_PERCENTILE = calculateHeightPercentileLMS(
  SAMPLE_HEIGHT,
  SAMPLE_AGE,
  SAMPLE_GENDER
);
export const SAMPLE_PREDICTED = predictAdultHeightLMS(
  SAMPLE_HEIGHT,
  SAMPLE_AGE,
  SAMPLE_GENDER
);

// Growth path from current age to 18
export function buildGrowthPath() {
  const points: { age: number; height: number }[] = [
    { age: SAMPLE_AGE, height: SAMPLE_HEIGHT },
  ];
  for (let a = SAMPLE_AGE + 0.5; a <= 17.5; a += 0.5) {
    const h = heightAtSamePercentile(
      SAMPLE_HEIGHT,
      SAMPLE_AGE,
      a,
      SAMPLE_GENDER
    );
    if (h > 0) points.push({ age: a, height: h });
  }
  points.push({ age: 18, height: SAMPLE_PREDICTED });
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
export const WEBSITE_URL = "dflo-production.up.railway.app";
