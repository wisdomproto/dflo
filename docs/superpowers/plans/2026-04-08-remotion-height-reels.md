# Remotion Height Prediction Reels — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an Instagram Reels ad video (9:16, ~27s) showcasing the 187 Growth Care height prediction feature with animated growth chart.

**Architecture:** Remotion project in `remotion/` directory at repo root. Five scene components orchestrated via `TransitionSeries`. SVG-based growth chart adapted from v4's `AnimatedGrowthChart`. Data/calculations copied from v4's `growthStandard.ts`. Audio via `@remotion/media` and `@remotion/sfx`.

**Tech Stack:** Remotion 4, TypeScript, @remotion/paths, @remotion/transitions, @remotion/google-fonts, @remotion/media, @remotion/sfx, SVG

---

## Chunk 1: Project Setup & Data Layer

### Task 1: Scaffold Remotion project

**Files:**
- Create: `remotion/package.json`
- Create: `remotion/tsconfig.json`
- Create: `remotion/remotion.config.ts`
- Create: `remotion/src/Root.tsx` (minimal placeholder)

- [ ] **Step 1: Create remotion directory and initialize project**

```bash
cd C:/projects/dflo_0.1
npx create-video@latest remotion --template blank --package-manager npm
```

If the interactive CLI doesn't support `--template`, manually scaffold:

```bash
mkdir -p remotion && cd remotion
npm init -y
npm install remotion @remotion/cli @remotion/bundler
npm install @remotion/paths @remotion/transitions @remotion/google-fonts @remotion/media @remotion/sfx
npm install -D typescript @types/react @types/react-dom
```

- [ ] **Step 2: Add remaining Remotion packages**

```bash
cd C:/projects/dflo_0.1/remotion
npx remotion add @remotion/paths
npx remotion add @remotion/transitions
npx remotion add @remotion/google-fonts
npx remotion add @remotion/media
npx remotion add @remotion/sfx
```

- [ ] **Step 3: Create remotion.config.ts**

```ts
// remotion/remotion.config.ts
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

- [ ] **Step 4: Create minimal Root.tsx to verify setup**

```tsx
// remotion/src/Root.tsx
import { Composition } from "remotion";

const Placeholder: React.FC = () => (
  <div style={{ flex: 1, background: "linear-gradient(135deg, #667eea, #764ba2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <span style={{ color: "white", fontSize: 60 }}>187 성장케어</span>
  </div>
);

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HeightReels"
      component={Placeholder}
      durationInFrames={810}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
```

- [ ] **Step 5: Verify preview works**

```bash
cd C:/projects/dflo_0.1/remotion
npx remotion preview
```

Expected: Browser opens with purple gradient placeholder at 1080x1920.

- [ ] **Step 6: Commit**

```bash
git add remotion/
git commit -m "feat: scaffold Remotion project for height prediction reels"
```

---

### Task 2: Copy data layer from v4

**Files:**
- Create: `remotion/src/data/growthStandard.ts` (copied from `v4/src/shared/data/growthStandard.ts`)
- Create: `remotion/src/data/growthChartData.json` (copied from `v4/src/features/guide/data/growthChartData.json`)
- Create: `remotion/src/lib/constants.ts`

- [ ] **Step 1: Copy growthStandard.ts**

```bash
mkdir -p C:/projects/dflo_0.1/remotion/src/data
cp C:/projects/dflo_0.1/v4/src/shared/data/growthStandard.ts C:/projects/dflo_0.1/remotion/src/data/growthStandard.ts
```

Remove the `import.meta.env` or Vite-specific references if any exist (there are none in this file, but verify).

- [ ] **Step 2: Copy growthChartData.json**

```bash
cp C:/projects/dflo_0.1/v4/src/features/guide/data/growthChartData.json C:/projects/dflo_0.1/remotion/src/data/growthChartData.json
```

- [ ] **Step 3: Create constants.ts with sample data**

Compute actual values using the LMS functions. For female, age 10, height 138cm:
- `calculateHeightPercentileLMS(138, 10, 'female')` → use the actual output
- `predictAdultHeightLMS(138, 10, 'female')` → use the actual output
- Generate path points with `heightAtSamePercentile()` for ages 10.5 to 18

```ts
// remotion/src/lib/constants.ts
import {
  calculateHeightPercentileLMS,
  predictAdultHeightLMS,
  heightAtSamePercentile,
} from "../data/growthStandard";

export const SAMPLE_GENDER = "female" as const;
export const SAMPLE_AGE = 10;
export const SAMPLE_HEIGHT = 138;

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
    const h = heightAtSamePercentile(SAMPLE_HEIGHT, SAMPLE_AGE, a, SAMPLE_GENDER);
    if (h > 0) points.push({ age: a, height: h });
  }
  points.push({ age: 18, height: SAMPLE_PREDICTED });
  return points;
}

// Colors
export const COLORS = {
  gradientStart: "#667eea",
  gradientEnd: "#764ba2",
  accent: "#F59E0B",
  accentDark: "#D97706",
  white: "#FFFFFF",
  whiteAlpha70: "rgba(255,255,255,0.7)",
  whiteAlpha95: "rgba(255,255,255,0.95)",
  chartPink5th: "#fda4af",
  chartPink50th: "#e11d48",
  chartPink95th: "#fda4af",
  chartBand: "#e11d48",
} as const;

// Timing
export const FPS = 30;
// Note: TransitionSeries handles scene timing internally.
// Each scene receives local frames starting at 0 via useCurrentFrame().

// SFX URLs (Remotion built-in)
export const SFX = {
  whoosh: "https://remotion.media/whoosh.wav",
  click: "https://remotion.media/mouse-click.wav",
  ding: "https://remotion.media/ding.wav",
} as const;

// Website URL for CTA
export const WEBSITE_URL = "dflo-production.up.railway.app";
```

- [ ] **Step 4: Verify constants compute correctly**

Temporarily add a console.log in Root.tsx to print computed values:

```ts
import { SAMPLE_PERCENTILE, SAMPLE_PREDICTED } from "./lib/constants";
console.log("Percentile:", SAMPLE_PERCENTILE, "Predicted:", SAMPLE_PREDICTED);
```

Run `npx remotion preview` and check the browser console. Remove the log after verifying.

- [ ] **Step 5: Commit**

```bash
git add remotion/src/data/ remotion/src/lib/
git commit -m "feat: add growth data layer and constants for reels"
```

---

### Task 3: Copy logo and create audio placeholders

**Files:**
- Create: `remotion/public/images/logo.jpg`
- Create: `remotion/public/audio/` (directory with README)

- [ ] **Step 1: Copy logo**

```bash
mkdir -p C:/projects/dflo_0.1/remotion/public/images
cp C:/projects/dflo_0.1/v4/public/images/logo.jpg C:/projects/dflo_0.1/remotion/public/images/logo.jpg
```

- [ ] **Step 2: Create audio directory with placeholder note**

```bash
mkdir -p C:/projects/dflo_0.1/remotion/public/audio
```

Create `remotion/public/audio/README.md`:
```
Place bgm.mp3 here (royalty-free background music).
SFX (typing, whoosh, pop) use Remotion's built-in URLs from remotion.media.
```

- [ ] **Step 3: Generate QR code image**

Use any online QR generator or npx command to create a QR code pointing to the height calculator page. Save as `remotion/public/images/qr-height.png` (200x200px minimum).

```bash
npx qrcode -o C:/projects/dflo_0.1/remotion/public/images/qr-height.png "https://dflo-production.up.railway.app/website"
```

If `npx qrcode` doesn't work, generate manually at https://www.qr-code-generator.com/ and save the file.

- [ ] **Step 4: Commit**

```bash
git add remotion/public/
git commit -m "feat: add logo and audio directory for reels"
```

---

## Chunk 2: Shared Components

### Task 4: GrowthChartSvg component

This is the core reusable chart component adapted from v4's `AnimatedGrowthChart.tsx`. It accepts a `progress` prop (0-1) instead of using React state, so Remotion's `useCurrentFrame()` can drive it.

**Files:**
- Create: `remotion/src/components/GrowthChartSvg.tsx`

- [ ] **Step 1: Create GrowthChartSvg with frame-driven animations**

Adapt v4's scaling utilities and path builders. Key change: all animations driven by `progress` prop, not state.

```tsx
// remotion/src/components/GrowthChartSvg.tsx
import { evolvePath } from "@remotion/paths";
import { interpolate, Easing } from "remotion";
import chartData from "../data/growthChartData.json";
import { COLORS, buildGrowthPath } from "../lib/constants";

type PercentileKey = "5th" | "50th" | "95th";

interface DataPoint {
  month: number;
  height: number;
}

// Chart dimensions (designed for embedding in 1080x1920 with padding)
const PADDING = { top: 40, right: 50, bottom: 60, left: 60 };
const WIDTH = 940;
const HEIGHT = 1000;
const CHART_W = WIDTH - PADDING.left - PADDING.right;
const CHART_H = HEIGHT - PADDING.top - PADDING.bottom;

const MIN_MONTH = 36;
const MAX_MONTH = 216;
const MIN_HEIGHT = 85;
const MAX_HEIGHT = 195;

function scaleX(month: number): number {
  return PADDING.left + ((month - MIN_MONTH) / (MAX_MONTH - MIN_MONTH)) * CHART_W;
}

function scaleY(height: number): number {
  return PADDING.top + CHART_H - ((height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)) * CHART_H;
}

function filterRange(points: DataPoint[]): DataPoint[] {
  return points.filter((p) => p.month >= MIN_MONTH && p.month <= MAX_MONTH);
}

function pointsToPath(points: DataPoint[]): string {
  const filtered = filterRange(points);
  const sampled = filtered.filter((_, i) => i % 3 === 0 || i === filtered.length - 1);
  return sampled
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.month).toFixed(1)} ${scaleY(p.height).toFixed(1)}`)
    .join(" ");
}

function areaPath(lower: DataPoint[], upper: DataPoint[]): string {
  const sampledLower = filterRange(lower).filter((_, i) => i % 3 === 0 || i === filterRange(lower).length - 1);
  const sampledUpper = filterRange(upper).filter((_, i) => i % 3 === 0 || i === filterRange(upper).length - 1);
  const forward = sampledLower
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.month).toFixed(1)} ${scaleY(p.height).toFixed(1)}`)
    .join(" ");
  const backward = [...sampledUpper]
    .reverse()
    .map((p) => `L ${scaleX(p.month).toFixed(1)} ${scaleY(p.height).toFixed(1)}`)
    .join(" ");
  return `${forward} ${backward} Z`;
}

type GrowthChartSvgProps = {
  /** 0-1: percentile curves draw progress */
  curvesProgress: number;
  /** 0-1: child trajectory draw progress */
  trajectoryProgress: number;
  /** 0-1: final point pulse scale */
  finalPointScale: number;
  /** 0-1: label opacity */
  labelOpacity: number;
  /** predicted height to show as label */
  predictedHeight: number;
};

export const GrowthChartSvg: React.FC<GrowthChartSvgProps> = ({
  curvesProgress,
  trajectoryProgress,
  finalPointScale,
  labelOpacity,
  predictedHeight,
}) => {
  const data = (chartData as any).female as Record<PercentileKey, DataPoint[]>;
  const growthPath = buildGrowthPath();

  // Convert growth path (age-based) to month-based for chart
  const childPoints: DataPoint[] = growthPath.map((p) => ({
    month: p.age * 12,
    height: p.height,
  }));

  const percentiles: PercentileKey[] = ["5th", "50th", "95th"];
  const ageLabels = [3, 5, 7, 9, 11, 13, 15, 17];
  const heightLabels = [90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190];

  // Child trajectory SVG path
  const childPathD = childPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.month).toFixed(1)} ${scaleY(p.height).toFixed(1)}`)
    .join(" ");

  const lastChild = childPoints[childPoints.length - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="band-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.chartBand} stopOpacity={0.06} />
          <stop offset="50%" stopColor={COLORS.chartBand} stopOpacity={0.12} />
          <stop offset="100%" stopColor={COLORS.chartBand} stopOpacity={0.06} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {heightLabels.map((h) => (
        <g key={h}>
          <line x1={PADDING.left} y1={scaleY(h)} x2={WIDTH - PADDING.right} y2={scaleY(h)} stroke="#e5e7eb" strokeWidth={0.5} />
          <text x={PADDING.left - 8} y={scaleY(h) + 4} textAnchor="end" fill="#9ca3af" style={{ fontSize: 14 }}>{h}</text>
        </g>
      ))}
      {ageLabels.map((age) => (
        <g key={age}>
          <line x1={scaleX(age * 12)} y1={PADDING.top} x2={scaleX(age * 12)} y2={HEIGHT - PADDING.bottom} stroke="#e5e7eb" strokeWidth={0.5} />
          <text x={scaleX(age * 12)} y={HEIGHT - PADDING.bottom + 20} textAnchor="middle" fill="#6b7280" style={{ fontSize: 14 }}>{age}세</text>
        </g>
      ))}

      {/* Axis labels */}
      <text x={WIDTH / 2} y={HEIGHT - 10} textAnchor="middle" fill="#9ca3af" style={{ fontSize: 14 }}>나이</text>
      <text x={12} y={HEIGHT / 2} textAnchor="middle" fill="#9ca3af" style={{ fontSize: 14 }} transform={`rotate(-90, 12, ${HEIGHT / 2})`}>신장 (cm)</text>

      {/* Shaded band */}
      <path
        d={areaPath(data["5th"], data["95th"])}
        fill="url(#band-gradient)"
        opacity={interpolate(curvesProgress, [0, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />

      {/* Percentile curves with evolvePath */}
      {percentiles.map((p) => {
        const pathD = pointsToPath(data[p]);
        if (!pathD) return null;
        const isCenter = p === "50th";
        const evolved = evolvePath(curvesProgress, pathD);
        return (
          <path
            key={p}
            d={pathD}
            fill="none"
            stroke={p === "50th" ? COLORS.chartPink50th : COLORS.chartPink5th}
            strokeWidth={isCenter ? 3 : 1.5}
            strokeLinecap="round"
            strokeDasharray={evolved.strokeDasharray}
            strokeDashoffset={evolved.strokeDashoffset}
            opacity={isCenter ? 1 : 0.6}
          />
        );
      })}

      {/* Percentile labels */}
      {curvesProgress > 0.9 && percentiles.map((p) => {
        const points = filterRange(data[p]);
        const last = points[points.length - 1];
        if (!last) return null;
        const labelY = p === "5th" ? 12 : p === "95th" ? -6 : 4;
        return (
          <text
            key={`label-${p}`}
            x={scaleX(last.month) + 4}
            y={scaleY(last.height) + labelY}
            style={{ fontSize: 13, fill: p === "50th" ? COLORS.chartPink50th : COLORS.chartPink5th, fontWeight: p === "50th" ? 700 : 400 }}
            opacity={interpolate(curvesProgress, [0.9, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
          >
            {p}
          </text>
        );
      })}

      {/* Child trajectory */}
      {trajectoryProgress > 0 && (() => {
        const evolved = evolvePath(trajectoryProgress, childPathD);
        return (
          <path
            d={childPathD}
            fill="none"
            stroke={COLORS.accent}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={evolved.strokeDasharray}
            strokeDashoffset={evolved.strokeDashoffset}
            filter="url(#glow)"
          />
        );
      })()}

      {/* Child data points (appear as trajectory draws) */}
      {childPoints.map((p, i) => {
        const pointProgress = interpolate(
          trajectoryProgress,
          [i / childPoints.length, (i + 1) / childPoints.length],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        if (pointProgress <= 0) return null;
        return (
          <circle
            key={i}
            cx={scaleX(p.month)}
            cy={scaleY(p.height)}
            r={4}
            fill={COLORS.accent}
            stroke="white"
            strokeWidth={2}
            opacity={pointProgress}
          />
        );
      })}

      {/* Final point at age 18 — pulse */}
      {lastChild && finalPointScale > 0 && (
        <g transform={`translate(${scaleX(lastChild.month)}, ${scaleY(lastChild.height)}) scale(${finalPointScale})`}>
          <circle cx={0} cy={0} r={10} fill={COLORS.accent} stroke="white" strokeWidth={3} />
          <circle cx={0} cy={0} r={16} fill="none" stroke={COLORS.accent} strokeWidth={1.5} opacity={0.4} />
        </g>
      )}

      {/* Predicted height label */}
      {lastChild && labelOpacity > 0 && (
        <g opacity={labelOpacity}>
          <rect
            x={scaleX(lastChild.month) - 55}
            y={scaleY(lastChild.height) - 38}
            width={110}
            height={28}
            rx={8}
            fill={COLORS.accent}
          />
          <text
            x={scaleX(lastChild.month)}
            y={scaleY(lastChild.height) - 20}
            textAnchor="middle"
            fill="white"
            style={{ fontSize: 16, fontWeight: 700 }}
          >
            {predictedHeight.toFixed(1)}cm
          </text>
        </g>
      )}
    </svg>
  );
};
```

- [ ] **Step 2: Verify in preview**

Temporarily render `GrowthChartSvg` in Root.tsx with static progress values (curvesProgress=1, trajectoryProgress=1, etc.) to confirm it renders correctly.

- [ ] **Step 3: Commit**

```bash
git add remotion/src/components/GrowthChartSvg.tsx
git commit -m "feat: add GrowthChartSvg component for reels"
```

---

### Task 5: Particles component

**Files:**
- Create: `remotion/src/components/Particles.tsx`

- [ ] **Step 1: Create Particles burst component**

```tsx
// remotion/src/components/Particles.tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../lib/constants";

const PARTICLE_COUNT = 10;
const PARTICLE_COLORS = [COLORS.accent, COLORS.gradientStart, COLORS.gradientEnd, "#fbbf24", "#a78bfa"];

// Deterministic pseudo-random based on index
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

type ParticlesProps = {
  /** Frame at which burst starts (local frame) */
  startFrame: number;
  /** Center x */
  cx: number;
  /** Center y */
  cy: number;
};

export const Particles: React.FC<ParticlesProps> = ({ startFrame, cx, cy }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = frame - startFrame;

  if (elapsed < 0 || elapsed > fps * 1) return null; // 1 second lifetime

  const progress = interpolate(elapsed, [0, fps * 0.7], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + seededRandom(i) * 0.5;
        const distance = interpolate(progress, [0, 1], [0, 80 + seededRandom(i + 10) * 70]);
        const size = interpolate(progress, [0, 0.3, 1], [0, 8 + seededRandom(i + 20) * 6, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const opacity = interpolate(progress, [0, 0.2, 1], [0, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const x = cx + Math.cos(angle) * distance;
        const y = cy + Math.sin(angle) * distance;
        const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity,
            }}
          />
        );
      })}
    </>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add remotion/src/components/Particles.tsx
git commit -m "feat: add Particles burst component"
```

---

### Task 6: PhoneMockup component

**Files:**
- Create: `remotion/src/components/PhoneMockup.tsx`

- [ ] **Step 1: Create simple phone frame**

```tsx
// remotion/src/components/PhoneMockup.tsx
type PhoneMockupProps = {
  children: React.ReactNode;
  scale?: number;
};

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ children, scale = 1 }) => {
  return (
    <div
      style={{
        width: 360 * scale,
        height: 720 * scale,
        borderRadius: 40 * scale,
        border: `4px solid rgba(255,255,255,0.3)`,
        backgroundColor: "white",
        overflow: "hidden",
        boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
        position: "relative",
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120 * scale,
          height: 28 * scale,
          backgroundColor: "#1a1a2e",
          borderRadius: `0 0 ${16 * scale}px ${16 * scale}px`,
          zIndex: 10,
        }}
      />
      {/* Screen content */}
      <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
        {children}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add remotion/src/components/PhoneMockup.tsx
git commit -m "feat: add PhoneMockup component"
```

---

## Chunk 3: Scene Components

### Task 7: HookScene (Scene 1)

**Files:**
- Create: `remotion/src/scenes/HookScene.tsx`

- [ ] **Step 1: Create HookScene with typewriter text**

```tsx
// remotion/src/scenes/HookScene.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/NotoSansKR";
import { COLORS } from "../lib/constants";

const { fontFamily } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin", "korean"] });

const HOOK_TEXT = "우리 아이,\n몇 cm까지\n클까?";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Typewriter: reveal characters over first 2 seconds
  const totalChars = HOOK_TEXT.length;
  const charsToShow = Math.floor(
    interpolate(frame, [0, 2 * fps], [0, totalChars], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );
  const visibleText = HOOK_TEXT.slice(0, charsToShow);

  // Cursor blink
  const cursorOpacity = charsToShow < totalChars ? (Math.floor(frame / 8) % 2 === 0 ? 1 : 0) : 0;

  // Subtle scale entrance
  const scale = interpolate(frame, [0, 15], [0.9, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.gradientStart}, ${COLORS.gradientEnd})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: "center",
          padding: "0 80px",
        }}
      >
        <span
          style={{
            fontFamily,
            fontSize: 72,
            fontWeight: 900,
            color: COLORS.white,
            lineHeight: 1.3,
            whiteSpace: "pre-line",
            textShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          {visibleText}
          <span style={{ opacity: cursorOpacity, color: COLORS.accent }}>|</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Preview in Root.tsx**

Temporarily set Root.tsx composition to render HookScene with 90 frames. Verify typewriter effect.

- [ ] **Step 3: Commit**

```bash
git add remotion/src/scenes/HookScene.tsx
git commit -m "feat: add HookScene with typewriter animation"
```

---

### Task 8: InputScene (Scene 2)

**Files:**
- Create: `remotion/src/scenes/InputScene.tsx`

- [ ] **Step 1: Create InputScene with typing animation in phone mockup**

```tsx
// remotion/src/scenes/InputScene.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing, Sequence } from "remotion";
import { Audio } from "@remotion/sfx";
import { loadFont } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { PhoneMockup } from "../components/PhoneMockup";
import { COLORS, SFX } from "../lib/constants";

const { fontFamily: notoFont } = loadFont("normal", { weights: ["400", "700"], subsets: ["korean"] });
const { fontFamily: interFont } = loadInter("normal", { weights: ["600", "700"], subsets: ["latin"] });

const FIELDS = [
  { label: "성별", value: "여아", delay: 15 },
  { label: "나이", value: "10세", delay: 50 },
  { label: "현재 키", value: "138 cm", delay: 85 },
];

const BUTTON_DELAY = 120;

export const InputScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phone entrance
  const phoneScale = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.gradientStart}, ${COLORS.gradientEnd})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ transform: `scale(${phoneScale})` }}>
        <PhoneMockup scale={1.8}>
          <div
            style={{
              padding: "60px 30px 30px",
              display: "flex",
              flexDirection: "column",
              gap: 24,
              height: "100%",
            }}
          >
            {/* Title */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: notoFont, fontSize: 22, fontWeight: 700, color: "#1f2937" }}>
                예상키 측정
              </span>
            </div>

            {/* Fields */}
            {FIELDS.map((field, i) => {
              const fieldProgress = interpolate(
                frame,
                [field.delay, field.delay + 20],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
              );
              const chars = Math.floor(fieldProgress * field.value.length);

              return (
                <div key={i} style={{ opacity: interpolate(frame, [field.delay - 5, field.delay], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                  <div style={{ fontFamily: notoFont, fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                    {field.label}
                  </div>
                  <div
                    style={{
                      backgroundColor: "#f3f4f6",
                      borderRadius: 12,
                      padding: "14px 16px",
                      fontFamily: interFont,
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#111827",
                      minHeight: 48,
                    }}
                  >
                    {field.value.slice(0, chars)}
                    {chars < field.value.length && (
                      <span style={{ color: COLORS.gradientStart, opacity: Math.floor(frame / 8) % 2 }}>|</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Button */}
            {frame >= BUTTON_DELAY && (() => {
              const btnScale = spring({ frame: frame - BUTTON_DELAY, fps, config: { damping: 15, stiffness: 200 } });
              const btnPressed = frame >= BUTTON_DELAY + 30
                ? interpolate(frame, [BUTTON_DELAY + 30, BUTTON_DELAY + 35], [1, 0.95], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                : 1;
              return (
                <div
                  style={{
                    marginTop: 16,
                    backgroundColor: COLORS.gradientStart,
                    borderRadius: 16,
                    padding: "16px 0",
                    textAlign: "center",
                    transform: `scale(${btnScale * btnPressed})`,
                  }}
                >
                  <span style={{ fontFamily: notoFont, fontSize: 18, fontWeight: 700, color: "white" }}>
                    측정하기
                  </span>
                </div>
              );
            })()}
          </div>
        </PhoneMockup>
      </div>

      {/* SFX: click sounds for each field */}
      {FIELDS.map((field, i) => (
        <Sequence key={i} from={field.delay} durationInFrames={15} layout="none">
          <Audio src={SFX.click} volume={0.4} />
        </Sequence>
      ))}
      {/* Button click */}
      <Sequence from={BUTTON_DELAY + 30} durationInFrames={15} layout="none">
        <Audio src={SFX.click} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Preview and verify**

- [ ] **Step 3: Commit**

```bash
git add remotion/src/scenes/InputScene.tsx
git commit -m "feat: add InputScene with typing animation"
```

---

### Task 9: ResultScene (Scene 3)

**Files:**
- Create: `remotion/src/scenes/ResultScene.tsx`

- [ ] **Step 1: Create ResultScene with count-up + particles**

```tsx
// remotion/src/scenes/ResultScene.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing, Sequence } from "remotion";
import { Audio } from "@remotion/sfx";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansKR";
import { Particles } from "../components/Particles";
import { COLORS, SAMPLE_PREDICTED, SAMPLE_PERCENTILE, SAMPLE_GENDER, SAMPLE_AGE, SAMPLE_HEIGHT, SFX } from "../lib/constants";

const { fontFamily: interFont } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });
const { fontFamily: notoFont } = loadNoto("normal", { weights: ["500", "700"], subsets: ["korean"] });

export const ResultScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Count-up: frames 0-130 (about 4.3s)
  const countUpProgress = interpolate(frame, [0, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const displayValue = (countUpProgress * SAMPLE_PREDICTED).toFixed(1);

  // Badge entrance at frame 130
  const badgeScale = frame >= 130
    ? spring({ frame: frame - 130, fps, config: { damping: 12 } })
    : 0;

  // "예상 성인 키" label entrance
  const labelOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Sub info
  const subInfoOpacity = interpolate(frame, [130, 145], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ageYears = Math.floor(SAMPLE_AGE);
  const ageMonths = Math.round((SAMPLE_AGE % 1) * 12);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.gradientStart}, ${COLORS.gradientEnd})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
      }}
    >
      {/* Label */}
      <div style={{ opacity: labelOpacity }}>
        <span style={{ fontFamily: notoFont, fontSize: 32, fontWeight: 500, color: COLORS.whiteAlpha70 }}>
          예상 성인 키
        </span>
      </div>

      {/* Big number */}
      <div style={{ position: "relative" }}>
        <span style={{ fontFamily: interFont, fontSize: 140, fontWeight: 900, color: COLORS.white, textShadow: "0 4px 30px rgba(0,0,0,0.3)" }}>
          {displayValue}
        </span>
        <span style={{ fontFamily: interFont, fontSize: 48, fontWeight: 900, color: COLORS.whiteAlpha70 }}>
          {" "}cm
        </span>

        {/* Particles burst at count-up completion */}
        <Particles startFrame={130} cx={270} cy={70} />
      </div>

      {/* Percentile badge */}
      <div
        style={{
          transform: `scale(${badgeScale})`,
          backgroundColor: "rgba(255,255,255,0.2)",
          borderRadius: 50,
          padding: "12px 36px",
          backdropFilter: "blur(10px)",
        }}
      >
        <span style={{ fontFamily: notoFont, fontSize: 24, fontWeight: 700, color: COLORS.white }}>
          상위 {(100 - SAMPLE_PERCENTILE).toFixed(0)}%
        </span>
      </div>

      {/* Sub info */}
      <div style={{ opacity: subInfoOpacity, display: "flex", gap: 16 }}>
        <div style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 30, padding: "8px 20px" }}>
          <span style={{ fontFamily: notoFont, fontSize: 18, color: COLORS.white }}>
            {SAMPLE_GENDER === "female" ? "여아" : "남아"} · {ageYears}세 {ageMonths > 0 ? `${ageMonths}개월` : ""}
          </span>
        </div>
        <div style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 30, padding: "8px 20px" }}>
          <span style={{ fontFamily: notoFont, fontSize: 18, color: COLORS.white }}>
            현재 {SAMPLE_HEIGHT}cm
          </span>
        </div>
      </div>

      {/* SFX */}
      <Sequence from={0} durationInFrames={30} layout="none">
        <Audio src={SFX.whoosh} volume={0.5} />
      </Sequence>
      <Sequence from={130} durationInFrames={30} layout="none">
        <Audio src={SFX.ding} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Preview and verify count-up + particles**

- [ ] **Step 3: Commit**

```bash
git add remotion/src/scenes/ResultScene.tsx
git commit -m "feat: add ResultScene with count-up and particles"
```

---

### Task 10: ChartScene (Scene 4)

**Files:**
- Create: `remotion/src/scenes/ChartScene.tsx`

- [ ] **Step 1: Create ChartScene driving GrowthChartSvg with frame-based progress**

```tsx
// remotion/src/scenes/ChartScene.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing, Sequence } from "remotion";
import { Audio } from "@remotion/sfx";
import { loadFont } from "@remotion/google-fonts/NotoSansKR";
import { GrowthChartSvg } from "../components/GrowthChartSvg";
import { COLORS, SAMPLE_PREDICTED, SFX } from "../lib/constants";

const { fontFamily: notoFont } = loadFont("normal", { weights: ["700"], subsets: ["korean"] });

export const ChartScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card entrance: frames 0-20
  const cardScale = spring({ frame, fps, config: { damping: 200 } });
  const cardOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Curves draw: frames 20-110
  const curvesProgress = interpolate(frame, [20, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Child trajectory: frames 110-180
  const trajectoryProgress = interpolate(frame, [110, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Final point pulse: frames 180-210
  const finalPointScale = frame >= 180
    ? spring({ frame: frame - 180, fps, config: { damping: 8 } })
    : 0;

  // Label: frames 180-200
  const labelOpacity = interpolate(frame, [180, 200], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.gradientStart}, ${COLORS.gradientEnd})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 50px",
      }}
    >
      {/* Title */}
      <div
        style={{
          marginBottom: 24,
          opacity: cardOpacity,
          transform: `scale(${cardScale})`,
        }}
      >
        <span style={{ fontFamily: notoFont, fontSize: 36, fontWeight: 700, color: COLORS.white }}>
          성장 예측 도표
        </span>
      </div>

      {/* Chart card */}
      <div
        style={{
          backgroundColor: COLORS.whiteAlpha95,
          borderRadius: 24,
          padding: "30px 20px 20px",
          width: "100%",
          opacity: cardOpacity,
          transform: `scale(${cardScale})`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <GrowthChartSvg
          curvesProgress={curvesProgress}
          trajectoryProgress={trajectoryProgress}
          finalPointScale={finalPointScale}
          labelOpacity={labelOpacity}
          predictedHeight={SAMPLE_PREDICTED}
        />
      </div>

      {/* SFX */}
      <Sequence from={20} durationInFrames={30} layout="none">
        <Audio src={SFX.whoosh} volume={0.4} />
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Preview and verify chart animations**

- [ ] **Step 3: Commit**

```bash
git add remotion/src/scenes/ChartScene.tsx
git commit -m "feat: add ChartScene with animated growth chart"
```

---

### Task 11: CtaScene (Scene 5)

**Files:**
- Create: `remotion/src/scenes/CtaScene.tsx`

- [ ] **Step 1: Create CtaScene with staggered entrance**

```tsx
// remotion/src/scenes/CtaScene.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { COLORS, WEBSITE_URL } from "../lib/constants";

const { fontFamily: notoFont } = loadFont("normal", { weights: ["700", "900"], subsets: ["korean"] });
const { fontFamily: interFont } = loadInter("normal", { weights: ["600"], subsets: ["latin"] });

export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const item = (delay: number) => ({
    transform: `translateY(${(1 - spring({ frame, fps, delay, config: { damping: 200 } })) * 60}px)`,
    opacity: spring({ frame, fps, delay, config: { damping: 200 } }),
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.gradientStart}, ${COLORS.gradientEnd})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        padding: "0 80px",
      }}
    >
      {/* Logo */}
      <div style={item(0)}>
        <Img
          src={staticFile("images/logo.jpg")}
          style={{ width: 200, height: 200, borderRadius: 30, objectFit: "cover" }}
        />
      </div>

      {/* Main CTA text */}
      <div style={{ ...item(8), textAlign: "center" }}>
        <span style={{ fontFamily: notoFont, fontSize: 52, fontWeight: 900, color: COLORS.white, lineHeight: 1.3 }}>
          지금 무료로{"\n"}측정해보세요
        </span>
      </div>

      {/* QR Code — pre-generated PNG in public/images/qr-height.png */}
      <div style={item(16)}>
        <div style={{
          backgroundColor: "white",
          borderRadius: 20,
          padding: 16,
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
        }}>
          <Img
            src={staticFile("images/qr-height.png")}
            style={{ width: 160, height: 160 }}
          />
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          ...item(24),
          backgroundColor: "rgba(255,255,255,0.2)",
          borderRadius: 20,
          padding: "16px 40px",
          backdropFilter: "blur(10px)",
        }}
      >
        <span style={{ fontFamily: interFont, fontSize: 24, fontWeight: 600, color: COLORS.white }}>
          {WEBSITE_URL}
        </span>
      </div>

      {/* Subtext */}
      <div style={item(32)}>
        <span style={{ fontFamily: notoFont, fontSize: 22, color: COLORS.whiteAlpha70 }}>
          187 성장클리닉 · 연세새봄의원
        </span>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Preview and verify**

- [ ] **Step 3: Commit**

```bash
git add remotion/src/scenes/CtaScene.tsx
git commit -m "feat: add CtaScene with staggered entrance"
```

---

## Chunk 4: Main Composition & Audio

### Task 12: HeightReels main composition

**Files:**
- Create: `remotion/src/HeightReels.tsx`
- Modify: `remotion/src/Root.tsx`

- [ ] **Step 1: Create HeightReels.tsx with TransitionSeries**

```tsx
// remotion/src/HeightReels.tsx
import { AbsoluteFill, staticFile, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Audio } from "@remotion/media";
import { HookScene } from "./scenes/HookScene";
import { InputScene } from "./scenes/InputScene";
import { ResultScene } from "./scenes/ResultScene";
import { ChartScene } from "./scenes/ChartScene";
import { CtaScene } from "./scenes/CtaScene";

export const HeightReels: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // BGM volume: fade-in 1s, fade-out 2s
  const bgmVolume = (f: number) => {
    const fadeIn = interpolate(f, [0, fps], [0, 0.35], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(f, [durationInFrames - 2 * fps, durationInFrames], [0.35, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return Math.min(fadeIn, fadeOut);
  };

  // Transition durations
  const T = 15; // 0.5s transition overlap

  return (
    <AbsoluteFill>
      <TransitionSeries>
        {/* Scene 1: Hook — 3s */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 2: Input — 5s */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <InputScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 3: Result — 7s */}
        <TransitionSeries.Sequence durationInFrames={210}>
          <ResultScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 4: Chart — 7s */}
        <TransitionSeries.Sequence durationInFrames={210}>
          <ChartScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 5: CTA — 5s */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <CtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* BGM layer — plays throughout, if file exists */}
      {/* User must place bgm.mp3 in public/audio/ */}
      {/* Uncomment when bgm.mp3 is available: */}
      {/* <Audio src={staticFile("audio/bgm.mp3")} volume={bgmVolume} /> */}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Update Root.tsx**

```tsx
// remotion/src/Root.tsx
import { Composition } from "remotion";
import { HeightReels } from "./HeightReels";

// Total duration accounting for 4 transitions × 15 frames overlap = 60 frames less
// 90 + 150 + 210 + 210 + 150 - (4 * 15) = 750 frames = 25 seconds
const TOTAL_DURATION = 90 + 150 + 210 + 210 + 150 - 4 * 15;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HeightReels"
      component={HeightReels}
      durationInFrames={TOTAL_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
```

- [ ] **Step 3: Preview full composition**

```bash
cd C:/projects/dflo_0.1/remotion
npx remotion preview
```

Expected: All 5 scenes play in sequence with transitions. Total ~25 seconds.

- [ ] **Step 4: Fix any issues found during preview**

Check for:
- Transition timing feels natural
- Count-up numbers are correct (actual LMS values)
- Chart curves render properly
- Text is readable on mobile

- [ ] **Step 5: Commit**

```bash
git add remotion/src/HeightReels.tsx remotion/src/Root.tsx
git commit -m "feat: wire up HeightReels main composition with all scenes"
```

---

### Task 13: Final render test

- [ ] **Step 1: Add .gitignore for output**

Create `remotion/.gitignore`:
```
out/
node_modules/
```

- [ ] **Step 2: Render MP4**

```bash
cd C:/projects/dflo_0.1/remotion
npx remotion render HeightReels out/reels.mp4
```

Expected: MP4 file at `remotion/out/reels.mp4`, ~25 seconds, 1080x1920, 30fps.

- [ ] **Step 3: Verify output**

Open the MP4 and check:
- All 5 scenes present
- Transitions smooth
- Audio (SFX) plays at correct moments
- Text readable, no visual glitches
- File size reasonable for Instagram upload

- [ ] **Step 4: Commit**

```bash
git add remotion/.gitignore
git commit -m "feat: add render config and gitignore for remotion output"
```
