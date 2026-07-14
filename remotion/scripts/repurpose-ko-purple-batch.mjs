// 재배포 릴스(한글) 보라 프레임 리스타일 일괄 렌더.
// 대상: 기존 40개 중 완성본 3개(LXGI2XrPfOI/B9y6RmYQtj8/9C7PIn1Bub0) 제외 = 37개.
// 방식: PurpleRepurpose 컴포지션 + youtubeId→purpleTitles inputProps. 번들 1회 + 순차 renderMedia.
// 출력: out/shorts/repurpose-ko-purple/{NN}_{safeTitle}.mp4 + _manifest.json
// 사용:
//   node scripts/repurpose-ko-purple-batch.mjs           # 37개 전체
//   node scripts/repurpose-ko-purple-batch.mjs --sample  # 앞 2개만(검증)
//   node scripts/repurpose-ko-purple-batch.mjs 6 13      # 원본 idx 지정
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
const outDir = join(root, "out", "shorts", "repurpose-ko-purple");
mkdirSync(outDir, { recursive: true });
mkdirSync(pubVid, { recursive: true });

const URL = "dr187growup.com";

// purpleTitles.ts 는 TS라 직접 import 불가 → 정규식으로 파싱(빌드 의존 회피).
function loadTitles() {
  const txt = readFileSync(join(root, "src", "repurpose", "purpleTitles.ts"), "utf8");
  const body = txt.slice(txt.indexOf("PURPLE_TITLES"));
  const map = {};
  // "id": { kicker: "...", title: "..." }  또는  id: { ... }
  const re = /["']?([A-Za-z0-9_-]+)["']?\s*:\s*\{\s*kicker:\s*"((?:[^"\\]|\\.)*)"\s*,\s*title:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
  let m;
  while ((m = re.exec(body))) map[m[1]] = { kicker: m[2], title: m[3] };
  return map;
}
const TITLES = loadTitles();
const COMPLETED = new Set(["LXGI2XrPfOI", "B9y6RmYQtj8", "9C7PIn1Bub0"]);

// 기존 산출 매핑(idx/id/title/파일명)을 그대로 재사용 — sort_order/제목 매칭 일관.
const prevManifest = JSON.parse(readFileSync(join(root, "out", "shorts", "repurpose-ko", "_manifest.json"), "utf8"));

// 인자
const args = process.argv.slice(2);
const sample = args.includes("--sample");
const idxArgs = args.filter((a) => /^\d+$/.test(a)).map(Number);

let targets = prevManifest.filter((r) => !COMPLETED.has(r.id));
if (idxArgs.length) targets = idxArgs.map((n) => prevManifest.find((r) => r.idx === n)).filter(Boolean);
if (sample) targets = targets.slice(0, 2);

function safeName(title) {
  return (title || "")
    .replace(/[^가-힣㄰-㆏0-9A-Za-z ()._-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60) || "untitled";
}
function probeDur(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nokey=1:noprint_wrappers=1", file], { encoding: "utf8" });
  return parseFloat(out.trim());
}

console.log(`대상 ${targets.length}개 — 소스 확인 + public 복사…`);
const jobs = [];
const missingTitle = [];
for (const r of targets) {
  const t = TITLES[r.id];
  if (!t) { missingTitle.push(r.id); continue; }
  const src = join(srcDir, `${r.id}.mp4`);
  if (!existsSync(src)) { console.log(`  SKIP ${r.id}: 원본 mp4 없음`); continue; }
  const pub = join(pubVid, `${r.id}-src.mp4`);
  if (!existsSync(pub)) copyFileSync(src, pub);
  const sec = probeDur(src);
  const nn = String(r.idx).padStart(2, "0");
  const fname = `${nn}_${safeName(t.title)}.mp4`;
  jobs.push({ id: r.id, idx: r.idx, sec, videoSrc: `videos/${r.id}-src.mp4`, kicker: t.kicker, title: t.title, fname, out: join(outDir, fname), srcTitle: r.title });
}
if (missingTitle.length) { console.error(`❌ purpleTitles 누락: ${missingTitle.join(", ")}`); process.exit(1); }

console.log(`bundling… (${jobs.length} 렌더 예정)`);
const serveUrl = await bundle({ entryPoint: entry, onProgress: () => {} });
console.log("bundled.\n");

const manifest = [];
let done = 0, fail = 0;
for (const job of jobs) {
  const t0 = Date.now();
  try {
    const inputProps = { videoSrc: job.videoSrc, videoSec: job.sec, kicker: job.kicker, title: job.title, url: URL };
    const composition = await selectComposition({ serveUrl, id: "purple-repurpose", inputProps });
    let half = false;
    await renderMedia({
      composition, serveUrl, codec: "h264", outputLocation: job.out, inputProps,
      onProgress: ({ progress }) => { if (!half && progress >= 0.5) { half = true; process.stdout.write(`   …${job.fname} 50%\n`); } },
    });
    // renderMedia 가 "OK인데 파일 없음" 인 경우 감지 → 즉시 실패로 표시.
    if (!existsSync(job.out) || statSync(job.out).size < 10000) throw new Error("출력 파일 미기록(remotion_render_workaround 필요)");
    done++;
    const dt = Math.round((Date.now() - t0) / 1000);
    console.log(`✅ [${done + fail}/${jobs.length}] ${job.fname}  (${job.sec.toFixed(1)}s, ${dt}s)`);
    manifest.push({ idx: job.idx, id: job.id, file: job.fname, sec: Number(job.sec.toFixed(3)), kicker: job.kicker, title: job.title, srcTitle: job.srcTitle });
  } catch (e) {
    fail++;
    console.log(`❌ [${done + fail}/${jobs.length}] ${job.fname}: ${e && e.message ? e.message : e}`);
  }
}
// 부분 렌더도 병합(재개 안전): 기존 manifest 와 merge.
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
