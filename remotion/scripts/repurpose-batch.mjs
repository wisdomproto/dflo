// 유튜브 쇼츠 원본 → IG/FB 재배포본 일괄 렌더 (한국어).
// 대상: 최신순 idx 01~41 (9zW9kxeXZ9I → NUSYolfwBAA). #42+ 마사지/패치 등 다른 포맷 제외.
// 동작: 하단 "187성장클리닉" 로고를 187growup 로고 + dr187growup.com 으로 덮고 + 검정 아웃트로 3초 추가.
// 방식: 번들 1회 + 영상별 inputProps(videoSrc, videoSec) 로 순차 renderMedia (영상 렌더라 동시성 1).
// 출력: out/shorts/repurpose-ko/{NN}_{safeTitle}.mp4 + _manifest.json
// 사용:
//   node scripts/repurpose-batch.mjs            # 41개 전체
//   node scripts/repurpose-batch.mjs --sample   # 앞 2개만 (배치 검증용)
//   node scripts/repurpose-batch.mjs 1 5 41     # 원본 인덱스 지정 렌더
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readdirSync, readFileSync, copyFileSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const entry = join(root, "src", "index.ts");
const srcDir = join(root, "sources", "originals");
const pubVid = join(root, "public", "videos");
const outDir = join(root, "out", "shorts", "repurpose-ko");
mkdirSync(outDir, { recursive: true });
mkdirSync(pubVid, { recursive: true });

const URL = "dr187growup.com";              // 한국 채널 (태국은 추후 dr187growup.com/th)
const OUTRO = "우리 아이 예측키\n지금 무료로 측정";

// 1) 최신순 정렬 → idx 01~41 (NUSYolfwBAA 까지)
const infos = readdirSync(srcDir).filter((f) => f.endsWith(".info.json") && !f.startsWith("_"));
const rows = infos
  .map((f) => {
    const j = JSON.parse(readFileSync(join(srcDir, f), "utf8"));
    return { id: f.replace(/\.info\.json$/, ""), title: j.title || "", date: j.upload_date || "" };
  })
  .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

const CUT = rows.findIndex((r) => r.id === "NUSYolfwBAA");
if (CUT < 0) { console.error("NUSYolfwBAA 원본을 못 찾음 — 소스 폴더 확인"); process.exit(1); }
// #25 vPiAzexi33g(일본 워크샵 비하인드) — "예측키 무료 측정" 아웃트로와 톤 불일치라 업로드 제외
const EXCLUDE = new Set(["vPiAzexi33g"]);
let targets = rows.slice(0, CUT + 1).filter((r) => !EXCLUDE.has(r.id)); // 40개

// 인자
const args = process.argv.slice(2);
const sample = args.includes("--sample");
const idxArgs = args.filter((a) => /^\d+$/.test(a)).map(Number);
if (sample) targets = targets.slice(0, 2);
else if (idxArgs.length) targets = idxArgs.map((n) => rows[n - 1]).filter(Boolean);

// 파일명 안전화: 접두/해시태그/이모지/금지문자 제거, 한글·영숫자·기본기호만
function safeName(title) {
  return (title || "")
    .replace(/^▶️?\s*\[#?187성장클리닉\]\s*/, "") // 공통 접두
    .replace(/#\S+/g, "")                          // 해시태그
    .replace(/[^가-힣㄰-㆏0-9A-Za-z ()._-]/g, "") // 화이트리스트(이모지·?!= 등 제거)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60) || "untitled";
}

function probeDur(file) {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nokey=1:noprint_wrappers=1", file],
    { encoding: "utf8" }
  );
  return parseFloat(out.trim());
}

console.log(`대상 ${targets.length}개 — public 복사 + 길이 측정…`);
const jobs = [];
for (const r of targets) {
  const origIdx = rows.findIndex((x) => x.id === r.id) + 1;
  const src = join(srcDir, `${r.id}.mp4`);
  if (!existsSync(src)) { console.log(`  SKIP ${r.id}: 원본 mp4 없음`); continue; }
  const pub = join(pubVid, `${r.id}-src.mp4`); // *-src.mp4 = gitignored
  if (!existsSync(pub)) copyFileSync(src, pub);
  const sec = probeDur(src);
  const nn = String(origIdx).padStart(2, "0");
  jobs.push({
    id: r.id, idx: origIdx, sec,
    videoSrc: `videos/${r.id}-src.mp4`,
    fname: `${nn}_${safeName(r.title)}.mp4`,
    out: join(outDir, `${nn}_${safeName(r.title)}.mp4`),
    title: r.title,
  });
}

console.log(`bundling… (${jobs.length} 렌더 예정 · public 영상 복사 포함되어 수초 소요)`);
const serveUrl = await bundle({ entryPoint: entry, onProgress: () => {} });
console.log("bundled.\n");

const manifest = [];
let done = 0, fail = 0;
for (const job of jobs) {
  const t0 = Date.now();
  try {
    const inputProps = { videoSrc: job.videoSrc, videoSec: job.sec, url: URL, outroLine: OUTRO };
    const composition = await selectComposition({ serveUrl, id: "ShortRepurpose", inputProps });
    let half = false;
    await renderMedia({
      composition, serveUrl, codec: "h264", outputLocation: job.out, inputProps,
      onProgress: ({ progress }) => {
        if (!half && progress >= 0.5) { half = true; process.stdout.write(`   …${job.fname} 50%\n`); }
      },
    });
    done++;
    const dt = Math.round((Date.now() - t0) / 1000);
    console.log(`✅ [${done + fail}/${jobs.length}] ${job.fname}  (${job.sec.toFixed(1)}s 원본, ${dt}s 렌더)`);
    manifest.push({ idx: job.idx, id: job.id, file: job.fname, sec: Number(job.sec.toFixed(3)), title: job.title });
  } catch (e) {
    fail++;
    console.log(`❌ [${done + fail}/${jobs.length}] ${job.fname}: ${e && e.message ? e.message : e}`);
  }
}

writeFileSync(join(outDir, "_manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nDONE: ${done} 렌더, ${fail} 실패 → ${outDir}`);
