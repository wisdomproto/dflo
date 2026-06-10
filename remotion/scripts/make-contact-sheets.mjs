// 언어별 62장 커버를 한 판(컨택트 시트)으로 합쳐 전수 검토. n 라벨 표시.
// 출력: remotion/out/_work/sheet-{lang}.png  (ImageMagick 7 montage)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dir = join(root, "out", "marketing", "thumbs");
const workDir = join(root, "out", "_work");
mkdirSync(workDir, { recursive: true });

const LANGS = ["ko", "th", "vi", "en", "cn", "ch"];
for (const lang of LANGS) {
  const files = [];
  for (let n = 1; n <= 62; n++) { const f = join(dir, `${n}-${lang}.png`); if (existsSync(f)) files.push(f); }
  const out = join(workDir, `sheet-${lang}.png`);
  execFileSync("magick", [
    "montage", ...files,
    "-tile", "8x", "-geometry", "300x533+6+8",
    "-background", "#0f1014", "-bordercolor", "#2a2c36", "-border", "1",
    "-label", "%t", "-fill", "#7ef", "-pointsize", "26",
    out,
  ], { stdio: "inherit" });
  console.log(`sheet-${lang} ← ${files.length} covers → ${out}`);
}
