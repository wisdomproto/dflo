// 영어 광고(thad-en) 렌더 — renderFrames → ffmpeg mux → 세로 릴스본 크롭.
// ★renderMedia 는 이 머신에서 "성공했는데 mp4 가 안 써진다"(끝에 자기 프로세스 kill 시 EPERM)
//   → 프레임을 디스크로 뽑고 내가 직접 합친다([[remotion_render_workaround]]).
// 오디오(fin.wav)는 make-thad-en.mjs 산출물 재사용 — 레이아웃만 바뀌면 다시 만들 필요 없다.
// 사용: node scripts/render-thad-en.mjs
import { bundle } from "@remotion/bundler";
import { selectComposition, renderFrames } from "@remotion/renderer";
import { mkdirSync, existsSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "..");
const workDir = join(REPO, "out", "_work", "thad-en");
const framesDir = join(workDir, "frames");
const mix = join(workDir, "fin.wav");
const outWide = join(REPO, "out", "ads", "thad-en.mp4");
const outTall = join(REPO, "out", "ads", "thad-en-vertical.mp4");

// 세로 콘텐츠는 1920x1080 안에 x 656..1264 로 레터박스돼 있다(ThAdEN 의 COL_LEFT/COL_W).
const CROP = ["-vf", "crop=608:1080:656:0,scale=1080:1920:flags=lanczos"];

if (!existsSync(mix)) { console.error("믹스 없음:", mix, "— 먼저 make-thad-en.mjs"); process.exit(1); }
[framesDir, dirname(outWide)].forEach((d) => mkdirSync(d, { recursive: true }));
rmSync(framesDir, { recursive: true, force: true });   // 옛 프레임이 남으면 조용히 섞인다
mkdirSync(framesDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: join(ROOT, "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: "thad-en", inputProps: {} });
console.log(`renderFrames… (${composition.durationInFrames}f)`);
await renderFrames({
  serveUrl, composition, inputProps: {}, imageFormat: "jpeg", jpegQuality: 94,
  outputDir: framesDir, onFrameUpdate: () => {}, onStart: () => {},
});

const sample = readdirSync(framesDir).find((f) => f.endsWith(".jpeg"));
const pad = (sample.match(/(\d+)\.jpeg$/) || [])[1]?.length || 4;
const pattern = join(framesDir, `${sample.replace(/\d+\.jpeg$/, "")}%0${pad}d.jpeg`);
const enc = (out, extra) => execFileSync("ffmpeg", [
  "-y", "-framerate", "30", "-start_number", "0", "-i", pattern, "-i", mix, ...extra,
  "-c:v", "libx264", "-crf", "19", "-preset", "medium", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out,
], { stdio: "ignore" });

enc(outWide, []);
enc(outTall, CROP);
console.log(`✅ ${outWide}\n✅ ${outTall}`);
