# Remotion Height Prediction Reels Video

## Overview
Instagram Reels ad video (9:16) showcasing the 187 Growth Care height prediction feature.
Built with Remotion, reusing data/calculations from v4.

## Target
- **Format**: Instagram Reels, 1080x1920 (9:16), 30fps
- **Duration**: ~27 seconds (810 frames)
- **Output**: MP4

## Sample Data
- 10-year-old female, current height 138cm
- **Note**: Percentile and predicted height will be computed at build time using the actual LMS functions from `growthStandard.ts` (`calculateHeightPercentileLMS`, `heightAtSamePercentile`) to ensure medical accuracy. Approximate values: ~55th percentile, ~162cm.

## Scene Breakdown

### Scene 1: Hook (0-3s, frames 0-90)
- Gradient background (#667eea → #764ba2)
- Typewriter text: "우리 아이, 몇 cm까지 클까?"
- Font: Noto Sans KR 48px bold, white

### Scene 2: Input (3-8s, frames 90-240)
- Phone mockup frame centered on gradient background
- Inside phone: input form with fields appearing one by one
- Typing animation: "여아 · 10세 · 138cm"
- "측정하기" button tap animation at end
- SFX: typing.mp3 on each field

### Scene 3: Result (8-15s, frames 240-450)
- Transition: slide from bottom
- **Sub-timing**:
  - Frames 240-370: Count-up 0 → predicted cm (Inter 120px black, Easing.out(cubic))
  - Frames 370-410: Percentile badge spring entrance + particle burst (8-12 dots, amber/purple, radius 80-150px, fade out over 20 frames)
  - Frames 410-450: Hold / breathe
- SFX: whoosh.mp3 at frame 240, pop.mp3 at frame 370

### Scene 4: Growth Chart (15-22s, frames 450-660)
- Transition: fade
- White card (rgba(255,255,255,0.95), border-radius 24px) on gradient background
- SVG growth chart (adapted from AnimatedGrowthChart):
  - **Sub-timing**:
    - Frames 450-470: Card entrance (spring, scale 0→1)
    - Frames 470-560: Percentile curves (5th/50th/95th) draw in with evolvePath, shaded band fade-in
    - Frames 560-630: Child trajectory (amber #F59E0B) draws with evolvePath
    - Frames 630-660: Final point at age 18 pulses (scale spring bounce) + "162cm" label fade-in
- SFX: whoosh.mp3 at frame 470

### Scene 5: CTA (22-27s, frames 660-810)
- Transition: slide from bottom
- Text: "지금 무료로 측정해보세요"
- Website URL text
- QR code (linking to height calculator)
- 187 Growth Care logo
- Spring entrance animations, staggered

## Visual Style
- **Palette**: Gradient #667eea → #764ba2 (background), #F59E0B (accent), white (text)
- **Typography**: Noto Sans KR (Korean) + Inter (numbers), via @remotion/google-fonts
- **Effects**: spring { damping: 200 } for entrances, evolvePath for line drawing
- **Transitions**: @remotion/transitions slide(from-bottom) + fade between scenes

## Audio
- **BGM**: Royalty-free lo-fi/electronic, volume 0.3-0.4, fade-in 1s, fade-out 2s
  - User provides `public/audio/bgm.mp3`
- **SFX** (free sources, downloaded during setup):
  - `typing.mp3` — keyboard tick for Scene 2
  - `whoosh.mp3` — Scene 3 start, Scene 4 line drawing
  - `pop.mp3` — Scene 3 count-up completion + particle burst

## Project Structure
```
remotion/
├── package.json
├── remotion.config.ts
├── src/
│   ├── Root.tsx              # Composition definition
│   ├── HeightReels.tsx       # Main composition (TransitionSeries)
│   ├── scenes/
│   │   ├── HookScene.tsx
│   │   ├── InputScene.tsx
│   │   ├── ResultScene.tsx
│   │   ├── ChartScene.tsx
│   │   └── CtaScene.tsx
│   ├── components/
│   │   ├── Particles.tsx
│   │   ├── PhoneMockup.tsx
│   │   └── GrowthChartSvg.tsx
│   ├── data/
│   │   ├── growthStandard.ts    # Copied from v4 (LMS calculations)
│   │   └── growthChartData.json # Copied from v4 (percentile data)
│   └── lib/
│       └── constants.ts
├── public/
│   ├── audio/
│   │   ├── bgm.mp3           # User-provided
│   │   ├── typing.mp3        # Free SFX
│   │   ├── whoosh.mp3
│   │   └── pop.mp3
│   └── images/
│       └── logo.jpg          # Copied from v4
```

## Dependencies
- remotion, @remotion/cli — core
- @remotion/paths — SVG line drawing animation (evolvePath)
- @remotion/transitions — scene transitions (fade, slide)
- @remotion/google-fonts — Noto Sans KR, Inter
- @remotion/media-utils — audio duration detection for precise fade timing
- qrcode (or pre-generated static QR image in public/images/)

## Code Reuse from v4
- `v4/src/shared/data/growthStandard.ts` → copy entire file (includes internal helpers `interpolateLMS`, `zScoreFromLMS`, `heightFromLMS`, `zToPercentile` and type definitions needed by exported functions)
- `v4/src/features/guide/data/growthChartData.json` → copy as-is
- `v4/src/features/guide/components/AnimatedGrowthChart.tsx` → adapt `scaleX`, `scaleY`, `pointsToPath`, `areaPath` utilities into GrowthChartSvg.tsx
- `v4/public/images/logo.jpg` → copy

## Rendering
```bash
cd remotion
npx remotion preview   # Dev preview in browser
npx remotion render HeightReels out/reels.mp4  # Final render
```

## Parametrization (Future)
The composition accepts props (gender, age, height) via Zod schema, enabling:
- Multiple gender/age variants from a single codebase
- A/B testing different scenarios
