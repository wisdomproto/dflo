// 컷별 검토용 스틸 추출 — 한 번 번들 → 여러 프레임 PNG 일괄 렌더(재번들 X).
//   node scripts/review-stills.mjs [compId]
// 출력: out/_work/review/f####-label.png
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "out/_work/review");
mkdirSync(OUT, { recursive: true });

const COMP = process.argv[2] || "MainClipTH";
const SCALE = process.argv[3] ? Number(process.argv[3]) : 0.6;

// 컷별 대표 프레임 (30fps). [frame, label]  —  argv[4]="510,2100,..." 주면 그 프레임만(풀해상도 점검용)
const DEFAULT_FRAMES = [
  [345, "cut1-circles-start"],
  [465, "cut1-circles-all"],
  [510, "cut1-title"],
  [660, "cut2-step01"],
  [840, "cut2-step02"],
  [1005, "cut2-step03"],
  [1200, "cut2-step04"],
  [1410, "cut2-step05"],
  [1575, "cut3-q1-card"],
  [1830, "cut3-grid2x2"],
  [2100, "cut4-q2-card"],
  [2310, "cut4-labels"],
  [2910, "cut4-venn"],
  [3060, "cut5-q3-card"],
  [3540, "cut5-kids-callouts"],
  [4230, "cut6-q4-card"],
  [4950, "cut7-q5-card"],
  [5565, "cut7-xray"],
];
const FRAMES = process.argv[4]
  ? process.argv[4].split(",").map((f) => [Number(f), `hi${f}`])
  : DEFAULT_FRAMES;

console.log("📦 번들 중 (public 복사 포함, 1회만)...");
const serveUrl = await bundle({ entryPoint: join(ROOT, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: COMP });
console.log(`🎬 ${COMP} ${composition.width}x${composition.height} ${composition.durationInFrames}f`);

for (const [frame, label] of FRAMES) {
  const output = join(OUT, `f${String(frame).padStart(4, "0")}-${label}.png`);
  await renderStill({ serveUrl, composition, frame, output, overwrite: true, scale: SCALE });
  console.log(`✅ ${output}`);
}
console.log("done.");
