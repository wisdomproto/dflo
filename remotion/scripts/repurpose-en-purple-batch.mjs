// 재배포 릴스 영어판 보라 프레임 일괄 렌더.
// 대상: en 더빙(public/audio/en-dub/{id}.wav + .subs.json) 있는 id. 헤더 = purpleTitlesEn.
// 출력: out/shorts/repurpose-en-purple/{NN}_{safeTitle}.mp4 + _manifest.json
// 사용:
//   node scripts/repurpose-en-purple-batch.mjs           # 더빙 있는 전체
//   node scripts/repurpose-en-purple-batch.mjs --sample  # 앞 2개
//   node scripts/repurpose-en-purple-batch.mjs 6 13      # 원본 idx 지정
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, copyFileSync, existsSync, writeFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const entry = join(root, "src", "index.ts");
const srcDir = join(root, "sources", "originals");
const pubVid = join(root, "public", "videos");
const dubDir = join(root, "public", "audio", "en-dub");
const intlDir = join(root, "out", "_work", "stt-intl");
const outDir = join(root, "out", "shorts", "repurpose-en-purple");
mkdirSync(outDir, { recursive: true });

// purpleTitlesEn.ts 파싱
function loadTitlesEn() {
  const txt = readFileSync(join(root, "src", "repurpose", "purpleTitlesEn.ts"), "utf8");
  const body = txt.slice(txt.indexOf("PURPLE_TITLES_EN"));
  const map = {};
  const re = /["']?([A-Za-z0-9_-]+)["']?\s*:\s*\{\s*kicker:\s*"((?:[^"\\]|\\.)*)"\s*,\s*title:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
  let m; while ((m = re.exec(body))) map[m[1]] = { kicker: m[2], title: m[3] };
  return map;
}
const TITLES = loadTitlesEn();
const prevManifest = JSON.parse(readFileSync(join(root, "out", "shorts", "repurpose-ko", "_manifest.json"), "utf8"));

const args = process.argv.slice(2);
const sample = args.includes("--sample");
const idxArgs = args.filter((a) => /^\d+$/.test(a)).map(Number);
let targets = idxArgs.length ? idxArgs.map((n) => prevManifest.find((r) => r.idx === n)).filter(Boolean) : prevManifest.slice();

function safeName(t) { return (t || "").replace(/[^0-9A-Za-z ()._-]/g, "").replace(/\s+/g, " ").trim().slice(0, 50) || "untitled"; }
function probeDur(f) { return parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nokey=1:noprint_wrappers=1", f], { encoding: "utf8" }).trim()); }

const jobs = [];
for (const r of targets) {
  const t = TITLES[r.id];
  if (!t) { console.log(`  SKIP ${r.id}: 영어 헤더 없음`); continue; }
  // 더빙 wav 있으면 오디오+더빙자막, 없으면 무음+원본 STT 타이밍 자막(음성 없이 자막본)
  const wav = join(dubDir, `${r.id}.wav`), dubSubs = join(dubDir, `${r.id}.subs.json`);
  const hasAudio = existsSync(wav) && existsSync(dubSubs);
  const subsP = hasAudio ? dubSubs : join(intlDir, `${r.id}.json`);
  if (!existsSync(subsP)) { console.log(`  SKIP ${r.id}: 자막 소스 없음(번역 먼저)`); continue; }
  const src = join(srcDir, `${r.id}.mp4`);
  if (!existsSync(src)) { console.log(`  SKIP ${r.id}: 원본 없음`); continue; }
  const pub = join(pubVid, `${r.id}-src.mp4`);
  if (!existsSync(pub)) copyFileSync(src, pub);
  const sec = probeDur(src);
  const subs = JSON.parse(readFileSync(subsP, "utf8")).map((s) => ({ start: s.start, end: s.end, en: s.en, zh: s.zh }));
  const nn = String(r.idx).padStart(2, "0");
  const fname = `${nn}_${safeName(t.title)}.mp4`;
  jobs.push({ id: r.id, idx: r.idx, sec, videoSrc: `videos/${r.id}-src.mp4`, kicker: t.kicker, title: t.title, audioSrc: hasAudio ? `audio/en-dub/${r.id}.wav` : "", subs, fname, out: join(outDir, fname) });
}
if (sample) jobs.splice(2);
if (!jobs.length) { console.error("렌더할 대상 없음 (더빙/헤더 확인)"); process.exit(1); }

console.log(`bundling… (${jobs.length} 렌더 예정)`);
const serveUrl = await bundle({ entryPoint: entry, onProgress: () => {} });
console.log("bundled.\n");

const manifest = [];
let done = 0, fail = 0;
for (const job of jobs) {
  const t0 = Date.now();
  try {
    const inputProps = { videoSrc: job.videoSrc, videoSec: job.sec, kicker: job.kicker, title: job.title, audioSrc: job.audioSrc, subs: job.subs };
    const composition = await selectComposition({ serveUrl, id: "purple-repurpose-en", inputProps });
    await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: job.out, inputProps, onProgress: () => {} });
    if (!existsSync(job.out) || statSync(job.out).size < 10000) throw new Error("출력 미기록");
    done++;
    console.log(`✅ [${done + fail}/${jobs.length}] ${job.fname}  (${job.sec.toFixed(1)}s, ${Math.round((Date.now() - t0) / 1000)}s)`);
    manifest.push({ idx: job.idx, id: job.id, file: job.fname, sec: Number(job.sec.toFixed(3)), kicker: job.kicker, title: job.title });
  } catch (e) {
    fail++;
    console.log(`❌ [${done + fail}/${jobs.length}] ${job.fname}: ${e && e.message ? e.message : e}`);
  }
}
const mpath = join(outDir, "_manifest.json");
let merged = manifest;
if (existsSync(mpath) && (sample || idxArgs.length)) {
  const prev = JSON.parse(readFileSync(mpath, "utf8"));
  const byIdx = new Map(prev.map((x) => [x.idx, x]));
  for (const m of manifest) byIdx.set(m.idx, m);
  merged = [...byIdx.values()].sort((a, b) => a.idx - b.idx);
}
writeFileSync(mpath, JSON.stringify(merged, null, 2));
console.log(`\nDONE: ${done} 렌더, ${fail} 실패 → ${outDir}`);
