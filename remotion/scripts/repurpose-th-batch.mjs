// 재배포 영상 태국어판 일괄 렌더. 한국어판 manifest + 번역 json(헤더 제목 + 자막)을 합쳐
// ShortRepurpose 를 thai 모드(상단 태국어 헤더 + 하단 태국어 자막 + /th URL + 태국어 아웃트로)로 렌더.
// 입력: out/shorts/repurpose-ko/_manifest.json (id·sec·title) + out/_work/stt-th/{id}.th.json ({headerTitle, subtitles})
// 출력: out/shorts/repurpose-th/{NN}_{한국어제목}.mp4 + _manifest.json
// 사용: node scripts/repurpose-th-batch.mjs [--sample | 1 5 41]
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const entry = join(root, "src", "index.ts");
const koManifest = join(root, "out", "shorts", "repurpose-ko", "_manifest.json");
const thDir = join(root, "out", "_work", "stt-th");
const outDir = join(root, "out", "shorts", "repurpose-th");
mkdirSync(outDir, { recursive: true });

const URL = "dr187growup.com/th";
const OUTRO = "ส่วนสูงในอนาคตของลูกคุณ\nวัดฟรีได้เลยตอนนี้"; // 전 영상 공통 태국어 아웃트로 카피
const cleanTitle = (t) => (t || "").replace(/^▶️?\s*\[#?187성장클리닉\]\s*/, "").trim();
const safe = (t) => cleanTitle(t).replace(/#\S+/g, "").replace(/[^가-힣㄰-㆏0-9A-Za-z ()._-]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "untitled";

const manifest = JSON.parse(readFileSync(koManifest, "utf8"));
const args = process.argv.slice(2);
const sample = args.includes("--sample");
const idxArgs = args.filter((a) => /^\d+$/.test(a)).map(Number);
let targets = manifest;
if (sample) targets = manifest.slice(0, 2);
else if (idxArgs.length) targets = manifest.filter((m) => idxArgs.includes(m.idx));

const jobs = [];
for (const m of targets) {
  const thFile = join(thDir, `${m.id}.th.json`);
  if (!existsSync(thFile)) { console.log(`  SKIP ${m.idx} ${m.id}: 번역(${m.id}.th.json) 없음`); continue; }
  const th = JSON.parse(readFileSync(thFile, "utf8"));
  if (!th.headerTitle || !Array.isArray(th.subtitles)) { console.log(`  SKIP ${m.idx}: 번역 형식 이상`); continue; }
  const nn = String(m.idx).padStart(2, "0");
  jobs.push({ ...m, nn, headerTitle: th.headerTitle, subtitles: th.subtitles, fname: `${nn}_${safe(m.title)}.mp4`, out: join(outDir, `${nn}_${safe(m.title)}.mp4`) });
}
console.log(`대상 ${jobs.length}개 (번역 없음 ${targets.length - jobs.length}개 제외)`);
if (!jobs.length) { console.log("렌더할 게 없음 — 번역(stt-th) 먼저."); process.exit(0); }

console.log(`bundling… (${jobs.length} 렌더 예정)`);
const serveUrl = await bundle({ entryPoint: entry, onProgress: () => {} });
console.log("bundled.\n");

const manifestOut = [];
let done = 0, fail = 0;
for (const j of jobs) {
  const t0 = Date.now();
  try {
    const inputProps = { videoSrc: `videos/${j.id}-src.mp4`, videoSec: j.sec, url: URL, outroLine: OUTRO, thai: true, headerTitle: j.headerTitle, subtitles: j.subtitles };
    const composition = await selectComposition({ serveUrl, id: "ShortRepurpose", inputProps });
    let half = false;
    await renderMedia({
      composition, serveUrl, codec: "h264", outputLocation: j.out, inputProps,
      onProgress: ({ progress }) => { if (!half && progress >= 0.5) { half = true; process.stdout.write(`   …${j.fname} 50%\n`); } },
    });
    done++;
    console.log(`✅ [${done + fail}/${jobs.length}] ${j.fname}  (${Math.round((Date.now() - t0) / 1000)}s)`);
    manifestOut.push({ idx: j.idx, id: j.id, file: j.fname, sec: j.sec, title: j.title, headerTitle: j.headerTitle });
  } catch (e) {
    fail++;
    console.log(`❌ [${done + fail}/${jobs.length}] ${j.fname}: ${e && e.message ? e.message : e}`);
  }
}
writeFileSync(join(outDir, "_manifest.json"), JSON.stringify(manifestOut, null, 2));
console.log(`\nDONE: ${done} 렌더, ${fail} 실패 → ${outDir}`);
